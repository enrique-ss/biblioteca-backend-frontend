import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new UsuarioController();

/**
 * Restrição Global: Apenas Administradores (Bibliotecários) autenticados
 * podem acessar as rotas de gerenciamento de usuários.
 */
router.use(verificarToken, verificarBibliotecario);

// Rotas de Gestão de Usuários
router.get('/', controller.listar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.excluir);

// Rotas de Controle de Bloqueio
router.post('/:id/bloquear', controller.bloquear);
router.post('/:id/desbloquear', controller.desbloquear);

export default router;