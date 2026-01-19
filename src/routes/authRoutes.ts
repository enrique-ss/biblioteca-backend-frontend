import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();
const controller = new AuthController();

router.post('/registrar', controller.registrar);
router.post('/login', controller.login);

export default router;