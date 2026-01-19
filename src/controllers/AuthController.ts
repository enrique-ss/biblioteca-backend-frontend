import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { gerarToken } from '../middlewares/auth';

export class AuthController {
  registrar = async (req: Request, res: Response) => {
    try {
      const { nome, email, senha, tipo } = req.body;

      if (!nome || nome.trim().length < 3) {
        return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres' });
      }

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Email inválido' });
      }

      if (!senha || senha.length < 8) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
      }

      if (!['usuario', 'bibliotecario'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo deve ser "usuario" ou "bibliotecario"' });
      }

      const emailExistente = await db('usuarios').where({ email }).first();
      if (emailExistente) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      const senhaHash = await bcrypt.hash(senha, 10);

      const [id] = await db('usuarios').insert({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senha: senhaHash,
        tipo
      });

      const usuario = await db('usuarios').where({ id }).first();

      const token = gerarToken({
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo
      });

      res.status(201).json({
        message: 'Cadastro realizado com sucesso!',
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo
        }
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({ error: 'Erro ao realizar cadastro' });
    }
  }

  login = async (req: Request, res: Response) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const usuario = await db('usuarios')
        .where({ email: email.toLowerCase().trim() })
        .first();

      if (!usuario) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const token = gerarToken({
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo
      });

      res.json({
        message: 'Login realizado com sucesso!',
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo
        }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro ao realizar login' });
    }
  }
}