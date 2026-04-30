const { Router } = require('express');
const controller = require('../controllers/LivroController');
const { verificarToken, verificarBibliotecario, verificarRestricao } = require('../middlewares/auth');

/**
 * Rotas de Livros: Gerencia o catálogo físico da biblioteca.
 */
const router = Router();

// Todas as consultas de livros exigem que o usuário esteja logado
router.use(verificarToken);

// Buscar todos os livros (Público para todos os leitores, exceto bloqueados)
router.get('/', verificarRestricao('fisico'), controller.listar);

// Cadastrar um novo livro no catálogo (Apenas Bibliotecários)
router.post('/', verificarBibliotecario, controller.cadastrar);

// Editar informações de um livro existente (Apenas Bibliotecários)
router.put('/:id', verificarBibliotecario, controller.editar);

// Remover um livro do catálogo (Apenas Bibliotecários)
router.delete('/:id', verificarBibliotecario, controller.remover);

// Listar todos os exemplares físicos de um livro (Apenas Bibliotecários)
router.get('/:id/exemplares', verificarBibliotecario, controller.listarExemplares);

// Atualizar o estado de um exemplar específico (Apenas Bibliotecários)
router.patch('/:id/exemplares/:exemplar_id', verificarBibliotecario, controller.atualizarExemplar);

module.exports = router;

