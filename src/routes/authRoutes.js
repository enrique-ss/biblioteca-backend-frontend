const { Router } = require('express');
const controller = require('../controllers/AuthController');
const { verificarToken } = require('../middlewares/auth');

/**
 * Rotas de Autenticação: Gerencia o acesso ao sistema (Entrada, Cadastro e Perfil).
 */
const router = Router();

// Criar uma nova conta no sistema (Público)
router.post('/registrar', controller.registrar);

// Entrar no sistema com e-mail e senha (Público)
router.post('/login', controller.login);

// Editar as próprias informações (Exige que o usuário esteja logado)
router.put('/perfil', verificarToken, controller.editarPerfil);

// Buscar feed de atividades do usuário
router.get('/atividades', verificarToken, controller.getAtividades);

module.exports = router;

