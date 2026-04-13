import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import rotasAutenticacao from './routes/authRoutes';
import rotasLivros from './routes/LivroRoutes';
import rotasAlugueis from './routes/aluguelRoutes';
import rotasUsuarios from './routes/UsuarioRoutes';
import rotasEstatisticas from './routes/StatsRoutes';
import rotasAcervoDigital from './routes/AcervoDigitalRoutes';
import rotasInfantil from './routes/infantilRoutes';
import { configurarBanco } from './setup';

dotenv.config();

const app = express();
const PORTA = process.env.PORT || 3000;
const SEGREDO_JWT = process.env.JWT_SECRET || 'biblioverso-chave-secreta-2024';

// Configuração de CORS e middlewares básicos para JSON e URL-encoded
app.use(cors({ 
  origin: process.env.CORS_ORIGIN || '*', 
  credentials: true 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir arquivos estáticos da pasta public (frontend)
app.use(express.static('public'));

// Limitador de requisições: máximo de 20 tentativas de autenticação por IP em 15 minutos
const limitadorAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas detectadas. Por favor, aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Definição das rotas da API
app.use('/api/auth', limitadorAutenticacao, rotasAutenticacao);
app.use('/api/livros', rotasLivros);
app.use('/api/alugueis', rotasAlugueis);
app.use('/api/usuarios', rotasUsuarios);
app.use('/api/stats', rotasEstatisticas);
app.use('/api/acervo-digital', rotasAcervoDigital);
app.use('/api/infantil', rotasInfantil);

// Rota de verificação de integridade (Health Check)
app.get('/api/health', (req, res) => {
  res.json({ 
    message: '📚 API da Biblioteca Online (Biblio Verso)', 
    version: '1.0.0', 
    status: 'online' 
  });
});

// Rota padrão serve o index.html (frontend)
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Middleware para tratamento de rotas não existentes (404)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada', 
    path: req.path 
  });
});

// Middleware global para tratamento de erros internos (500)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado na aplicação:', err);
  
  res.status(500).json({
    error: 'Erro interno no servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um problema inesperado.'
  });
});

// Configuração automática do banco de dados antes de iniciar o servidor
const iniciarServidor = async () => {
  // Executa o setup do banco de dados automaticamente
  if (process.env.NODE_ENV === 'production') {
    console.log('🔧 Executando setup automático do banco de dados...');
    await configurarBanco();
  }

  // Inicialização do servidor HTTP
  const servidor = app.listen(PORTA, () => {
    console.log(`\n🚀 Servidor backend iniciado com sucesso na porta ${PORTA}`);
    console.log(`📍 Link local: http://localhost:${PORTA}`);
    console.log(`🌍 Ambiente atual: ${process.env.NODE_ENV || 'desenvolvimento'}\n`);
    console.log('📖 Para gerenciar via CLI, execute em outro terminal: npm run cli');
  });

  // Gerenciamento de encerramento gracioso (SIGTERM/SIGINT)
  const finalizarServidor = () => {
    console.log('\n🔴 Encerrando o servidor...');
    servidor.close(() => {
      console.log('👋 Servidor finalizado.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', finalizarServidor);
  process.on('SIGINT', finalizarServidor);
};

// Inicia o servidor
iniciarServidor();

export default app;