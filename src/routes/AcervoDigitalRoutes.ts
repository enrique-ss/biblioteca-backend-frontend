import { Router } from 'express';
import { AcervoDigitalController } from '../controllers/AcervoDigitalController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new AcervoDigitalController();

/**
 * Gestão do Acervo Digital: Rotas para manutenção e listagem de documentos.
 * Todas as rotas deste módulo exigem autenticação prévia.
 */
router.use(verificarToken);

// Listagem pública para todos os usuários logados
router.get('/', controller.listar);

// Operações restritas a Bibliotecários (Administradores)
router.post('/', verificarBibliotecario, controller.cadastrar);

export default router;
