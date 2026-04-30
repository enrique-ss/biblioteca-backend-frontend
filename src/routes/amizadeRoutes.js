const { Router } = require('express');
const controller = require('../controllers/AmizadeController');
const { verificarToken } = require('../middlewares/auth');

const router = Router();

// Todas as rotas de amizade exigem login
router.use(verificarToken);

router.post('/solicitar', controller.solicitar);
router.put('/:id/aceitar', controller.aceitar);
router.delete('/:id', controller.remover);
router.get('/pendentes', controller.listarPendentes);
router.get('/status/:outro_id', controller.checarStatus);
router.get('/:usuario_id', controller.listarAmigos);

module.exports = router;
