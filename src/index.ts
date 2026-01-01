import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './database';

// Importações usando nomes de variáveis claros para evitar conflitos de cache
import routerUsuario from './routes/UsuarioRoutes';
import routerAuth from './routes/AuthRoutes';
import routerLivro from './routes/LivroRoutes';
import routerAluguel from './routes/AluguelRoutes';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== DEFINIÇÃO DOS ENDPOINTS ==========

app.use('/api/auth', routerAuth);
app.use('/api/livros', routerLivro);
app.use('/api/alugueis', routerAluguel);
app.use('/api/usuarios', routerUsuario);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LuizaTeca Online!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const startServer = async () => {
  try {
    // Testa a conexão com o banco antes de subir
    await db.raw('SELECT 1');
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.clear();
      console.log('🚀 LUIZATECA ONLINE EM: http://127.0.0.1:' + PORT);
      console.log('👉 Em um novo terminal, escolha o método de acesso:\n\nDigite: "npm run cli" para acessar via terminal.\nDigite: "npm run web" para acessar via interface web.');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();