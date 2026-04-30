const { Router } = require('express');
const controller = require('../controllers/AluguelController');
const { verificarToken, verificarBibliotecario, verificarRestricao } = require('../middlewares/auth');

/**
 * Rotas de Aluguel: Controla o fluxo de empréstimos, devoluções, multas e renovações.
 */
const router = Router();

// Todas as rotas de aluguel exigem autenticação do usuário
router.use(verificarToken);

// --- Rotas do Leitor (Ações que o próprio aluno pode fazer) ---

// Ver os livros que estão atualmente comigo
router.get('/meus', verificarRestricao('fisico'), controller.meus);

// Ver meu histórico pessoal de multas
router.get('/multas/minhas', verificarRestricao('fisico'), controller.minhasMultas);

// Pagar minhas multas pendentes pelo sistema
router.put('/multas/pagar/mim', verificarRestricao('fisico'), controller.pagarMinhasMultas);

// Adiar a data de devolução de um livro (Renovação)
router.put('/:id/renovar', verificarRestricao('fisico'), controller.renovar);

// --- Rotas do Bibliotecário (Gestão administrativa) ---

// Listar todos os empréstimos ativos na biblioteca (Apenas Bibliotecários)
router.get('/todos', verificarBibliotecario, controller.listarTodos);

// Ver o histórico global de tudo o que já foi devolvido (Apenas Bibliotecários)
router.get('/historico', verificarBibliotecario, controller.historico);

// Ver o extrato de multas de um usuário específico (Apenas Bibliotecários)
router.get('/multas/:usuario_id', verificarBibliotecario, controller.listarMultas);

// Registrar a saída de um novo livro (Apenas Bibliotecários)
router.post('/', verificarBibliotecario, controller.criar);

// Registrar o retorno de um livro e calcular multas (Apenas Bibliotecários)
router.put('/:id/devolver', verificarBibliotecario, controller.devolver);

// Baixar manualmente as multas de um usuário (Apenas Bibliotecários)
router.put('/multas/:usuario_id/pagar', verificarBibliotecario, controller.pagarMulta);

// Ver empréstimos de um usuário específico (Público/Social)
router.get('/usuario/:usuario_id', controller.listarPorUsuario);

module.exports = router;

