import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { verificarToken } from '../middlewares/auth';

const router = Router();
const controller = new AuthController();

// Rotas públicas de acesso (Login e Registro)
router.post('/registrar', controller.registrar);
router.post('/login', controller.login);

// Gestão de perfil: apenas usuários logados podem acessar e alterar seus dados
router.put('/perfil', verificarToken, controller.editarPerfil);

export default router;