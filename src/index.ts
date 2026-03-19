import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';
import livroRoutes from './routes/LivroRoutes';
import aluguelRoutes from './routes/aluguelRoutes';
import usuarioRoutes from './routes/UsuarioRoutes';
import statsRoutes from './routes/StatsRoutes';
import quizRoutes from './routes/QuizRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting: máx 20 tentativas de auth por IP em 15 minutos
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/livros', livroRoutes);
app.use('/api/alugueis', aluguelRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/quiz', quizRoutes);

app.get('/', (req, res) => {
  res.json({ message: '📚 API Biblioteca Online', version: '1.0.0', status: 'online' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada', path: req.path });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Servidor iniciado na porta ${PORT}`);
  console.log(`📍 Acesse: http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}\n`);
  console.log('📚 Em outro terminal execute: npm run cli');
});

process.on('SIGTERM', () => { console.log('\n🔴 Encerrando servidor...'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('\n🔴 Encerrando servidor...'); server.close(() => process.exit(0)); });

export default app;