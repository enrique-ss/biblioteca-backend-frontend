import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { gerarToken, RequisicaoAutenticada } from '../middlewares/auth';

/**
 * Controlador responsável pelos processos de autenticação e gestão de perfil.
 */
export class AuthController {
  
  private getPermissions(tipo: string) {
    const ehAdmin = tipo === 'bibliotecario';
    return {
      can_manage: ehAdmin,
      can_edit: ehAdmin,
      can_delete: ehAdmin,
      can_approve: ehAdmin,
      can_view_stats: ehAdmin,
      is_admin: ehAdmin
    };
  }
  registrar = async (req: Request, res: Response) => {
    try {
      const { nome, email, senha, tipo } = req.body;

      // Validação básica de nome
      if (!nome || nome.trim().length < 3) {
        return res.status(400).json({ error: 'O nome deve conter pelo menos 3 caracteres.' });
      }

      // Validação rigurosa de formato de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de e-mail inválido (exemplo: usuario@dominio.com).' });
      }

      // Validação de força de senha
      if (!senha || senha.length < 8) {
        return res.status(400).json({ error: 'A senha deve conter no mínimo 8 caracteres.' });
      }

      // Validação de papéis de usuário permitidos
      if (!['usuario', 'bibliotecario'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de conta inválido. Escolha entre "usuario" ou "bibliotecario".' });
      }

      // Verifica se o e-mail já está cadastrado para evitar duplicidade
      const emaisFormatado = email.toLowerCase().trim();
      const usuarioExistente = await db('usuarios').where({ email: emaisFormatado }).first();
      
      if (usuarioExistente) {
        return res.status(400).json({ error: 'Este endereço de e-mail já está em uso por outra conta.' });
      }

      // Criptografia da senha antes de salvar no banco
      const senhaCriptografada = await bcrypt.hash(senha, 10);

      // Insere o novo usuário e recupera o ID gerado
      const [novoId] = await db('usuarios').insert({
        nome: nome.trim(),
        email: emaisFormatado,
        senha: senhaCriptografada,
        tipo
      });

      const usuarioCriado = await db('usuarios').where({ id: novoId }).first();

      // Gera o token de acesso (JWT) para o novo usuário
      const tokenAcesso = gerarToken({ 
        id: usuarioCriado.id, 
        email: usuarioCriado.email, 
        tipo: usuarioCriado.tipo 
      });

      res.status(201).json({
        message: '✅ Conta criada com sucesso! Bem-vindo(a) ao Cristalário.',
        token: tokenAcesso,
        usuario: { 
          id: usuarioCriado.id, 
          nome: usuarioCriado.nome, 
          email: usuarioCriado.email, 
          tipo: usuarioCriado.tipo,
          permissions: this.getPermissions(usuarioCriado.tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao registrar usuário:', erro);
      res.status(500).json({ error: 'Ocorreu um erro interno ao realizar o cadastro.' });
    }
  }

  // Autenticação de usuários existentes
  login = async (req: Request, res: Response) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são campos obrigatórios.' });
      }

      const emailFormatado = email.toLowerCase().trim();
      const usuarioEncontrado = await db('usuarios').where({ email: emailFormatado }).first();

      // Verifica se o usuário existe e se a senha coincide com o hash salvo
      if (!usuarioEncontrado || !(await bcrypt.compare(senha, usuarioEncontrado.senha))) {
        return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
      }

      const tokenAcesso = gerarToken({ 
        id: usuarioEncontrado.id, 
        email: usuarioEncontrado.email, 
        tipo: usuarioEncontrado.tipo 
      });

      res.json({
        message: '✅ Login realizado com sucesso!',
        token: tokenAcesso,
        usuario: { 
          id: usuarioEncontrado.id, 
          nome: usuarioEncontrado.nome, 
          email: usuarioEncontrado.email, 
          tipo: usuarioEncontrado.tipo,
          permissions: this.getPermissions(usuarioEncontrado.tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao realizar login:', erro);
      res.status(500).json({ error: 'Ocorreu um erro interno ao tentar autenticar.' });
    }
  }

  // Permite que qualquer usuário autenticado edite suas próprias informações
  editarPerfil = async (req: RequisicaoAutenticada, res: Response) => {
    try {
      // O ID vem do token decodificado pelo middleware de autenticação
      const usuarioId = req.usuario!.id;
      const { nome, email, senha } = req.body;

      const mudancas: any = {};

      if (nome !== undefined) {
        if (nome.trim().length < 3) {
          return res.status(400).json({ error: 'O nome precisa ter ao menos 3 caracteres.' });
        }
        mudancas.nome = nome.trim();
      }

      if (email !== undefined) {
        const emailFormatado = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(emailFormatado)) {
          return res.status(400).json({ error: 'O formato do novo e-mail é inválido.' });
        }

        // Garante que o novo e-mail não pertença a outra pessoa
        const outroUsuarioComEmail = await db('usuarios')
          .where({ email: emailFormatado })
          .whereNot({ id: usuarioId })
          .first();
        
        if (outroUsuarioComEmail) {
          return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outro cadastro.' });
        }
        mudancas.email = emailFormatado;
      }

      if (senha !== undefined) {
        if (senha.length < 8) {
          return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres.' });
        }
        mudancas.senha = await bcrypt.hash(senha, 10);
      }

      // Só executa o update se houver algo para mudar
      if (Object.keys(mudancas).length > 0) {
        await db('usuarios').where({ id: usuarioId }).update(mudancas);
      }

      const usuarioAtualizado = await db('usuarios')
        .where({ id: usuarioId })
        .select('id', 'nome', 'email', 'tipo')
        .first();

      res.json({
        message: '✅ Perfil atualizado com sucesso!',
        usuario: {
          ...usuarioAtualizado,
          permissions: this.getPermissions(usuarioAtualizado.tipo)
        }
      });
    } catch (erro) {
      console.error('Erro ao atualizar perfil:', erro);
      res.status(500).json({ error: 'Ocorreu um erro ao tentar salvar as alterações no perfil.' });
    }
  }
}