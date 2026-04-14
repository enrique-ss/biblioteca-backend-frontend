const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { ensureDefaultAdmin } = require('./bootstrapAdmin');

dotenv.config();

const app = express();
const server = http.createServer(app);
const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: configuredCorsOrigins.length > 0 ? configuredCorsOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

app.set('io', io);

const PORTA = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

const rotasAutenticacao = require('./routes/authRoutes');
const rotasLivros = require('./routes/LivroRoutes');
const rotasAlugueis = require('./routes/aluguelRoutes');
const rotasUsuarios = require('./routes/UsuarioRoutes');
const rotasEstatisticas = require('./routes/StatsRoutes');
const rotasAcervoDigital = require('./routes/AcervoDigitalRoutes');
const rotasInfantil = require('./routes/infantilRoutes');

app.use('/api/auth', rotasAutenticacao);
app.use('/api/livros', rotasLivros);
app.use('/api/alugueis', rotasAlugueis);
app.use('/api/usuarios', rotasUsuarios);
app.use('/api/stats', rotasEstatisticas);
app.use('/api/acervo-digital', rotasAcervoDigital);
app.use('/api/infantil', rotasInfantil);

app.get('/api/health', (req, res) => {
  res.json({
    message: 'API da Biblioteca Online (Biblio Verso)',
    version: '1.0.0',
    status: 'online'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Rota nao encontrada',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('Erro nao tratado na aplicacao:', err);

  res.status(500).json({
    error: 'Erro interno no servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um problema inesperado.'
  });
});

const iniciarServidor = async () => {
  await ensureDefaultAdmin();

  io.on('connection', (socket) => {
    console.log(`Usuario conectado no Socket: ${socket.id}`);

    socket.on('joinRoom', (room) => {
      socket.join(room);
    });

    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${socket.id}`);
    });
  });

  server.listen(PORTA, '0.0.0.0', () => {
    console.log(`\nServidor backend Node + Socket.io iniciado com sucesso na porta ${PORTA}`);
    console.log(`Ambiente atual: ${process.env.NODE_ENV || 'development'}\n`);
  });

  const finalizarServidor = () => {
    console.log('\nEncerrando o servidor...');
    server.close(() => {
      console.log('Servidor finalizado.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', finalizarServidor);
  process.on('SIGINT', finalizarServidor);
};

iniciarServidor();

module.exports = app;
