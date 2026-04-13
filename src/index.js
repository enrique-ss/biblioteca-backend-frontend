const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

dotenv.config();

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(cors({ 
  origin: process.env.CORS_ORIGIN || '*', 
  credentials: true 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

const limitadorAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas detectadas. Por favor, aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const rotasAutenticacao = require('./routes/authRoutes');
const rotasLivros = require('./routes/LivroRoutes');
const rotasAlugueis = require('./routes/aluguelRoutes');
const rotasUsuarios = require('./routes/UsuarioRoutes');
const rotasEstatisticas = require('./routes/StatsRoutes');
const rotasAcervoDigital = require('./routes/AcervoDigitalRoutes');
const rotasInfantil = require('./routes/infantilRoutes');

app.use('/api/auth', limitadorAutenticacao, rotasAutenticacao);
app.use('/api/livros', rotasLivros);
app.use('/api/alugueis', rotasAlugueis);
app.use('/api/usuarios', rotasUsuarios);
app.use('/api/stats', rotasEstatisticas);
app.use('/api/acervo-digital', rotasAcervoDigital);
app.use('/api/infantil', rotasInfantil);

app.get('/api/health', (req, res) => {
  res.json({ 
    message: '📚 API da Biblioteca Online (Biblio Verso)', 
    version: '1.0.0', 
    status: 'online' 
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada', 
    path: req.path 
  });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado na aplicação:', err);
  
  res.status(500).json({
    error: 'Erro interno no servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um problema inesperado.'
  });
});

const { configurarBanco } = require('./setup');

const iniciarServidor = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('🔧 Executando setup automático do banco de dados...');
    await configurarBanco();
  }

  const servidor = app.listen(PORTA, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor backend iniciado com sucesso na porta ${PORTA}`);
    console.log(`📍 Link local: http://localhost:${PORTA}`);
    console.log(`🌍 Ambiente atual: ${process.env.NODE_ENV || 'desenvolvimento'}\n`);
  });

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

iniciarServidor();

module.exports = app;
