const { Router } = require('express');
const controller = require('../controllers/AuthController');
const { verificarToken } = require('../middlewares/auth');

const router = Router();

router.post('/registrar', controller.registrar);
router.post('/login', controller.login);
router.put('/perfil', verificarToken, controller.editarPerfil);

module.exports = router;
