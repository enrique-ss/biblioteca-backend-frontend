const { Router } = require('express');
const controller = require('../controllers/UsuarioController');
const { verificarToken, verificarBibliotecario } = require('../middlewares/auth');

/**
 * Rotas de Usuários: Gerenciamento administrativo de contas e permissões.
 * Todas as rotas abaixo são restritas a Bibliotecários.
 */
const router = Router();

// Aplica segurança global: apenas usuários logados podem ver a rota base
router.use(verificarToken);

// Listar todos os usuários ativos do sistema (acessível a todos para a página Social)
router.get('/', controller.listar);

// Atualizar informações de cadastro de um usuário (nome, e-mail, cargo)
router.put('/:id', verificarBibliotecario, controller.atualizar);

// Arquivar um usuário (Desativação de conta)
router.delete('/:id', verificarBibliotecario, controller.excluir);

// Impedir que um usuário realize novos empréstimos
router.patch('/:id/bloquear', verificarBibliotecario, controller.bloquear);

// Restaurar o acesso de um usuário bloqueado
router.patch('/:id/desbloquear', verificarBibliotecario, controller.desbloquear);

// Alternar entre Leitor e Bibliotecário
router.patch('/:id/mudar-tipo', verificarBibliotecario, controller.mudarTipo);

module.exports = router;

