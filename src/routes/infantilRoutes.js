const { Router } = require('express');
const controller = require('../controllers/InfantilController');
const { verificarToken } = require('../middlewares/auth');

const router = Router();

router.get('/data', verificarToken, controller.getData);
router.post('/validate-answer', verificarToken, controller.validateAnswer);
router.post('/finish-quiz', verificarToken, controller.finishQuiz);
router.post('/save-progress', verificarToken, controller.saveProgress);

module.exports = router;
