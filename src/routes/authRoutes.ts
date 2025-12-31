import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();

// Ajustado para bater com a chamada do CLI
router.post('/registrar', AuthController.register);
router.post('/login', AuthController.login);

export default router;