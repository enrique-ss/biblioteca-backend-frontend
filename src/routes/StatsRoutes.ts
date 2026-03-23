import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new StatsController();

// Resumo dos cartões do Dashboard (Acessível a todos os usuários logados)
router.get('/', verificarToken, controller.resumo);

// Relatórios e Gráficos Detalhados (Exclusivo para Administradores/Bibliotecários)
router.get('/detalhado', verificarToken, verificarBibliotecario, controller.detalhado);

export default router;