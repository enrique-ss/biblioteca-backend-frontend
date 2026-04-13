const { Router } = require('express');
const controller = require('../controllers/StatsController');
const { verificarToken, verificarBibliotecario } = require('../middlewares/auth');

const router = Router();

router.get('/', verificarToken, controller.resumo);
router.get('/detalhado', verificarToken, verificarBibliotecario, controller.detalhado);

module.exports = router;
