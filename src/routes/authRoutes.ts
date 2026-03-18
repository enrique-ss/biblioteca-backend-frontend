import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { verificarToken } from '../middlewares/auth';

const router = Router();
const controller = new AuthController();

router.post('/registrar', controller.registrar);
router.post('/login', controller.login);

// Qualquer usuário autenticado pode editar o próprio perfil
router.put('/perfil', verificarToken, controller.editarPerfil);

export default router;