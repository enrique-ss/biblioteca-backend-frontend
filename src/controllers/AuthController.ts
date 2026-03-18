import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { gerarToken, AuthRequest } from '../middlewares/auth';

export class AuthController {
  // ✅ PASSO 1: CRIAR CONTA
  registrar = async (req: Request, res: Response) => {
    try {
      const { nome, email, senha, tipo } = req.body;

      if (!nome || nome.trim().length < 3) {
        return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de email inválido (exemplo@email.com)' });
      }

      if (!senha || senha.length < 8) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
      }

      if (!['usuario', 'bibliotecario'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de conta deve ser "usuario" ou "bibliotecario"' });
      }

      const emailExistente = await db('usuarios').where({ email: email.toLowerCase().trim() }).first();
      if (emailExistente) {
        return res.status(400).json({ error: 'Este email já está sendo utilizado' });
      }

      const senhaHash = await bcrypt.hash(senha, 10);

      const [id] = await db('usuarios').insert({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senha: senhaHash,
        tipo
      });

      const usuario = await db('usuarios').where({ id }).first();

      const token = gerarToken({ id: usuario.id, email: usuario.email, tipo: usuario.tipo });

      res.status(201).json({
        message: '✅ Cadastro realizado com sucesso!',
        token,
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
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

      const usuario = await db('usuarios').where({ email: email.toLowerCase().trim() }).first();

      if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const token = gerarToken({ id: usuario.id, email: usuario.email, tipo: usuario.tipo });

      res.json({
        message: '✅ Login realizado com sucesso!',
        token,
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro ao realizar login' });
    }
  }

  // ✅ PASSO PERFIL: EDITAR PRÓPRIO PERFIL (qualquer usuário autenticado)
  editarPerfil = async (req: AuthRequest, res: Response) => {
    try {
      const id = req.usuario!.id;
      const { nome, email, senha } = req.body;

      const dadosAtualizacao: any = {};

      if (nome !== undefined) {
        if (nome.trim().length < 3) {
          return res.status(400).json({ error: 'O nome deve ter pelo menos 3 caracteres' });
        }
        dadosAtualizacao.nome = nome.trim();
      }

      if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Formato de email inválido' });
        }
        const emailExistente = await db('usuarios')
          .where({ email: email.toLowerCase().trim() })
          .whereNot({ id })
          .first();
        if (emailExistente) {
          return res.status(400).json({ error: 'Este email já está sendo utilizado por outro usuário' });
        }
        dadosAtualizacao.email = email.toLowerCase().trim();
      }

      if (senha !== undefined) {
        if (senha.length < 8) {
          return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
        }
        dadosAtualizacao.senha = await bcrypt.hash(senha, 10);
      }

      if (Object.keys(dadosAtualizacao).length > 0) {
        await db('usuarios').where({ id }).update(dadosAtualizacao);
      }

      const usuarioAtualizado = await db('usuarios')
        .where({ id })
        .select('id', 'nome', 'email', 'tipo')
        .first();

      res.json({
        message: '✅ Perfil atualizado com sucesso!',
        usuario: usuarioAtualizado
      });
    } catch (error) {
      console.error('Erro ao editar perfil:', error);
      res.status(500).json({ error: 'Erro ao editar perfil' });
    }
  }
}