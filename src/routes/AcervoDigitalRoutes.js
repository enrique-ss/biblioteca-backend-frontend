const { Router } = require('express');
const controller = require('../controllers/AcervoDigitalController');
const { verificarToken, verificarBibliotecario } = require('../middlewares/auth');

/**
 * Rotas de Acervo Digital: Define os caminhos para acessar e gerenciar PDFs e documentos.
 */
const router = Router();

// Todas as rotas de documentos digitais exigem que o usuário esteja logado
router.use(verificarToken);

// --- Rotas de Estatísticas (Devem vir antes das rotas com :id para evitar conflitos) ---

// Obter total de PDFs lidos pelo usuário logado
router.get('/estatisticas/leituras', controller.obterContagemLeituras);

// Obter total de PDFs enviados pelo usuário logado e aprovados
router.get('/estatisticas/subidos', controller.obterContagemSubidos);

// --- Rotas de Listagem e Cadastro ---

// Listar documentos aprovados (Público para todos os leitores)
router.get('/', controller.listar);

// Enviar um novo documento (Pode ser enviado por leitor ou bibliotecário)
router.post('/', controller.cadastrar);

// Listar documentos que aguardam aprovação (Apenas Bibliotecários)
router.get('/pendentes', verificarBibliotecario, controller.listarPendentes);

// --- Rotas com Parâmetros (:id) ---

// Registrar que um usuário leu um PDF
router.post('/:id/ler', controller.registrarLeitura);

// Aprovar um documento pendente (Apenas Bibliotecários)
router.patch('/:id/aprovar', verificarBibliotecario, controller.aprovar);

// Rejeitar e apagar um documento pendente (Apenas Bibliotecários)
router.patch('/:id/rejeitar', verificarBibliotecario, controller.rejeitar);

// Remover um documento do acervo aprovado (Apenas Bibliotecários)
router.delete('/:id', verificarBibliotecario, controller.remover);

module.exports = router;
