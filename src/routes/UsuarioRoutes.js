const { Router } = require('express');
const controller = require('../controllers/UsuarioController');
const { verificarToken, verificarBibliotecario } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken, verificarBibliotecario);

router.get('/', controller.listar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.excluir);
router.patch('/:id/bloquear', controller.bloquear);
router.patch('/:id/desbloquear', controller.desbloquear);

module.exports = router;
