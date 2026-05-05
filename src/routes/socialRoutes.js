const express = require('express');
const router = express.Router();
const controller = require('../controllers/SocialController');
const { verificarToken } = require('../middlewares/auth');

// --- AVALIAÇÕES ---
router.post('/avaliacoes', verificarToken, controller.adicionarAvaliacao);
router.get('/avaliacoes', verificarToken, controller.getAvaliacoes);

// --- COMENTÁRIOS NO FEED ---
router.post('/feed/comentarios', verificarToken, controller.adicionarComentarioFeed);
router.get('/feed/comentarios/:atividade_id', verificarToken, controller.getComentariosFeed);

// --- CLUBES DE LEITURA ---
router.post('/clubes', verificarToken, controller.criarClube);
router.get('/clubes', verificarToken, controller.getClubes);
router.get('/clubes/:id/perfil', verificarToken, controller.getClubePerfil);
router.post('/clubes/:clubeId/mensagens', verificarToken, controller.enviarMensagemClube);
router.get('/clubes/:clubeId/mensagens', verificarToken, controller.getMensagensClube);

// --- PERFIL DE LIVROS ---
router.get('/livros/:id/perfil', verificarToken, controller.getLivroPerfil);
router.get('/digital/:id/perfil', verificarToken, controller.getDigitalPerfil);

// --- CHAT PRIVADO ---
router.get('/conversas', verificarToken, controller.getConversasRecentes);
router.post('/chat/:userId', verificarToken, controller.enviarMensagemDireta);
router.get('/chat/:userId', verificarToken, controller.getMensagensDiretas);

module.exports = router;
