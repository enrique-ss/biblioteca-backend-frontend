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

// Envio de novo documento (pode ser feito por qualquer usuário)
router.post('/', controller.cadastrar);

// Rotas restritas a Bibliotecários (Gestão de Aprovações)
router.get('/pendentes', verificarBibliotecario, controller.listarPendentes);
router.patch('/:id/aprovar', verificarBibliotecario, controller.aprovar);
router.patch('/:id/rejeitar', verificarBibliotecario, controller.rejeitar);

export default router;
