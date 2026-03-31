import { Router } from 'express';
import { LivroController } from '../controllers/LivroController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new LivroController();

/**
 * Gestão do Acervo: Rotas para manutenção de livros e cópias físicas.
 * Todas as rotas deste módulo exigem autenticação prévia.
 */
router.use(verificarToken);

// Listagem pública para todos os usuários logados
router.get('/', controller.listar);

// Filtros para categoria e ano
router.get('/filtros', controller.carregarFiltros);

// Operações restritas a Bibliotecários (Administradores)
router.post('/', verificarBibliotecario, controller.cadastrar);
router.put('/:id', verificarBibliotecario, controller.editar);
router.delete('/:id', verificarBibliotecario, controller.remover);

// Gestão específica de cópias físicas (Exemplares)
router.get('/:id/exemplares', verificarBibliotecario, controller.listarExemplares);
router.patch('/:id/exemplares/:exemplar_id', verificarBibliotecario, controller.atualizarExemplar);

export default router;