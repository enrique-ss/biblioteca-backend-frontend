import { Request, Response } from 'express';
import { db } from '../database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      const { nome, email, telefone, endereco, senha, tipo } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }

      const existente = await db('usuarios').where({ email }).first();
      if (existente) return res.status(400).json({ error: 'Email já cadastrado' });

      const senhaHash = await bcrypt.hash(senha, 10);

      const [id] = await db('usuarios').insert({
        nome,
        email,
        telefone: telefone || null,
        endereco: endereco || null,
        senha: senhaHash,
        // Se o tipo enviado for 'bibliotecario', usa ele. Caso contrário, usa 'usuario'.
        tipo: tipo === 'bibliotecario' ? 'bibliotecario' : 'usuario'
      });

      const usuario = await db('usuarios').select('id', 'nome', 'email', 'tipo').where({ id }).first();
      const token = jwt.sign({ id: usuario.id, tipo: usuario.tipo }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({ token, usuario });
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao registrar usuário', details: error.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;
      const usuario = await db('usuarios').where({ email }).first();

      if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign({ id: usuario.id, tipo: usuario.tipo }, JWT_SECRET, { expiresIn: '7d' });
      const { senha: _, ...usuarioSemSenha } = usuario;

      res.json({ token, usuario: usuarioSemSenha });
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }
};