import { Router } from 'express';
import { LivroController } from '../controllers/livroController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new LivroController();

// Público: Ver os livros
router.get('/', controller.listar);

// Protegido: Só bibliotecário cadastra
router.post('/', verificarToken, verificarBibliotecario, controller.cadastrar);

export default router;