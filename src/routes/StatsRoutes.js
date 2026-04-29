const { Router } = require('express');
const controller = require('../controllers/StatsController');
const { verificarToken, verificarBibliotecario } = require('../middlewares/auth');

/**
 * Rotas de Estatísticas: Fornece dados e relatórios para o painel administrativo e do leitor.
 */
const router = Router();

// Obter resumo de indicadores (Geral ou Pessoal, dependendo de quem logou)
router.get('/', verificarToken, controller.resumo);

// Obter relatórios detalhados com gráficos (Apenas Bibliotecários)
router.get('/detalhado', verificarToken, verificarBibliotecario, controller.detalhado);

module.exports = router;

