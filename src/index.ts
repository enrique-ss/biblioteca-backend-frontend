import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/AuthRoutes';
import livroRoutes from './routes/LivroRoutes';
import aluguelRoutes from './routes/AluguelRoutes';
import usuarioRoutes from './routes/UsuarioRoutes';
import statsRoutes from './routes/StatsRoutes';
import quizRoutes from './routes/QuizRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
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
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
  console.log('📚 Em outro terminal digite: npm run cli');
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;