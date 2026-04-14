const { Router } = require('express');
const controller = require('../controllers/LivroController');
const { verificarToken, verificarBibliotecario } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken);

router.get('/', controller.listar);
router.post('/', verificarBibliotecario, controller.cadastrar);
router.put('/:id', verificarBibliotecario, controller.editar);
router.delete('/:id', verificarBibliotecario, controller.remover);
router.get('/:id/exemplares', verificarBibliotecario, controller.listarExemplares);
router.patch('/:id/exemplares/:exemplar_id', verificarBibliotecario, controller.atualizarExemplar);

module.exports = router;
