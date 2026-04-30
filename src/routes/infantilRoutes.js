const { Router } = require('express');
const controller = require('../controllers/InfantilController');
const { verificarToken, verificarRestricao } = require('../middlewares/auth');

/**
 * Rotas do Espaço Infantil: Gerencia as lições, quizzes e o progresso da gamificação.
 */
const router = Router();

// Carregar todo o conteúdo pedagógico e o perfil de XP do usuário
router.get('/data', verificarToken, verificarRestricao('infantil'), controller.getData);

// Validar se uma resposta do quiz está correta e processar perda de vidas
router.post('/validate-answer', verificarToken, verificarRestricao('infantil'), controller.validateAnswer);

// Finalizar o quiz, entregar recompensas de XP e subir de nível
router.post('/finish-quiz', verificarToken, verificarRestricao('infantil'), controller.finishQuiz);

// Sincronizar o progresso do usuário manualmente
router.post('/save-progress', verificarToken, verificarRestricao('infantil'), controller.saveProgress);

module.exports = router;

