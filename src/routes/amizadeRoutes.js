const { Router } = require('express');
const controller = require('../controllers/AmizadeController');
const { verificarToken, verificarRestricao } = require('../middlewares/auth');

const router = Router();

// Todas as rotas de amizade exigem login
router.use(verificarToken);

router.post('/solicitar', verificarRestricao('social'), controller.solicitar);
router.put('/:id/aceitar', verificarRestricao('social'), controller.aceitar);
router.delete('/:id', verificarRestricao('social'), controller.remover);
router.get('/pendentes', verificarRestricao('social'), controller.listarPendentes);
router.get('/status/:outro_id', verificarRestricao('social'), controller.checarStatus);
router.get('/:usuario_id', verificarRestricao('social'), controller.listarAmigos);

module.exports = router;
