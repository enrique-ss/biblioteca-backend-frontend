import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { gerarToken } from '../middlewares/auth';

export class AuthController {
  // ✅ PASSO 1: CRIAR CONTA
  registrar = async (req: Request, res: Response) => {
    try {
      const { nome, email, senha, tipo } = req.body;

      // Regra: Nome (Pelo menos 3 letras)
      if (!nome || nome.trim().length < 3) {
        return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres' });
      }

      // Regra: Email (Deve ser válido)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de email inválido (exemplo@email.com)' });
      }

      // Regra: Senha (Mínimo 8 caracteres)
      if (!senha || senha.length < 8) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
      }

      // Regra: Tipo (Só usuario ou bibliotecario)
      if (!['usuario', 'bibliotecario'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de conta deve ser "usuario" ou "bibliotecario"' });
      }

      // Regra: Email Único
      const emailExistente = await db('usuarios').where({ email: email.toLowerCase().trim() }).first();
      if (emailExistente) {
        return res.status(400).json({ error: 'Este email já está sendo utilizado' });
      }

      // Regra: Senha Criptografada
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

      // Retorno conforme Passo 1
      res.status(201).json({
        message: '✅ Cadastro realizado com sucesso!',
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

  // ✅ PASSO 2: FAZER LOGIN
  login = async (req: Request, res: Response) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const usuario = await db('usuarios')
        .where({ email: email.toLowerCase().trim() })
        .first();

      // Regra: Procura no banco e compara senha criptografada
      if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const token = gerarToken({
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo
      });

      // Retorno conforme Passo 2
      res.json({
        message: '✅ Login realizado com sucesso!',
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