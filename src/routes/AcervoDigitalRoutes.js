const { Router } = require('express');
const controller = require('../controllers/AcervoDigitalController');
const { verificarToken, verificarBibliotecario } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken);

router.get('/', controller.listar);
router.post('/', controller.cadastrar);
router.get('/pendentes', verificarBibliotecario, controller.listarPendentes);
router.patch('/:id/aprovar', verificarBibliotecario, controller.aprovar);
router.patch('/:id/rejeitar', verificarBibliotecario, controller.rejeitar);
router.delete('/:id', verificarBibliotecario, controller.remover);

module.exports = router;
