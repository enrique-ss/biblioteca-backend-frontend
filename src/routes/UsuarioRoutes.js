const { Router } = require('express');
const controller = require('../controllers/UsuarioController');
const { verificarToken, verificarBibliotecario } = require('../middlewares/auth');

/**
 * Rotas de Usuários: Gerenciamento administrativo de contas e permissões.
 * Todas as rotas abaixo são restritas a Bibliotecários.
 */
const router = Router();

// Aplica segurança global: apenas bibliotecários logados podem gerenciar usuários
router.use(verificarToken, verificarBibliotecario);

// Listar todos os usuários ativos do sistema
router.get('/', controller.listar);

// Atualizar informações de cadastro de um usuário (nome, e-mail, cargo)
router.put('/:id', controller.atualizar);

// Arquivar um usuário (Desativação de conta)
router.delete('/:id', controller.excluir);

// Impedir que um usuário realize novos empréstimos
router.patch('/:id/bloquear', controller.bloquear);

// Restaurar o acesso de um usuário bloqueado
router.patch('/:id/desbloquear', controller.desbloquear);

module.exports = router;

