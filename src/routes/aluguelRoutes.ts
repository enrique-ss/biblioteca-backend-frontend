import { Router } from 'express';
import { AluguelController } from '../controllers/AluguelController';
import { verificarToken, verificarBibliotecario } from '../middlewares/auth';

const router = Router();
const controller = new AluguelController();

/**
 * Gestão de Empréstimos e Multas: Cuida de toda a circulação de livros da biblioteca.
 * Todas as rotas deste módulo são protegidas por autenticação.
 */
router.use(verificarToken);

// --- Rotas para Alunos (Usuários Comuns) ---
router.get('/meus', controller.meus);
router.get('/multas/minhas', controller.minhasMultas);
router.put('/multas/pagar/mim', controller.pagarMinhasMultas);
router.put('/:id/renovar', controller.renovar);

// --- Rotas Administrativas (Apenas Bibliotecários) ---

// Consultas de Controle
router.get('/todos', verificarBibliotecario, controller.listarTodos);
router.get('/historico', verificarBibliotecario, controller.historico);
router.get('/multas/:usuario_id', verificarBibliotecario, controller.listarMultas);

// Operações de Registro e Financeiro
router.post('/', verificarBibliotecario, controller.criar);
router.put('/:id/devolver', verificarBibliotecario, controller.devolver);
router.put('/multas/:usuario_id/pagar', verificarBibliotecario, controller.pagarMulta);

export default router;