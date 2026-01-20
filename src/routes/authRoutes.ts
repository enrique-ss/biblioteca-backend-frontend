import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();
const authController = new AuthController();

// Abertas: Ninguém tem token antes de logar/cadastrar
router.post('/registrar', authController.registrar);
router.post('/login', authController.login);

export default router;