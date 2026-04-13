const { Router } = require('express');
const controller = require('../controllers/AluguelController');
const { verificarToken, verificarBibliotecario } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken);

router.get('/meus', controller.meus);
router.get('/multas/minhas', controller.minhasMultas);
router.put('/multas/pagar/mim', controller.pagarMinhasMultas);
router.put('/:id/renovar', controller.renovar);

router.get('/todos', verificarBibliotecario, controller.listarTodos);
router.get('/historico', verificarBibliotecario, controller.historico);
router.get('/multas/:usuario_id', verificarBibliotecario, controller.listarMultas);
router.post('/', verificarBibliotecario, controller.criar);
router.put('/:id/devolver', verificarBibliotecario, controller.devolver);
router.put('/multas/:usuario_id/pagar', verificarBibliotecario, controller.pagarMulta);

module.exports = router;
