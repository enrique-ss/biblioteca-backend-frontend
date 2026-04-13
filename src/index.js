const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.set('io', io); // Disponibilizar para os controllers

const PORTA = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors());
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

const iniciarServidor = async () => {
  // Configuração global de conexões WebSockets
  io.on('connection', (socket) => {
    console.log(`🟢 Usuário conectado no Socket: ${socket.id}`);
    
    // Opcional: Entrar em "salas" baseadas em permissão no futuro
    socket.on('joinRoom', (room) => {
      socket.join(room);
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Usuário desconectado: ${socket.id}`);
    });
  });

  server.listen(PORTA, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor backend Node + Socket.io iniciado com sucesso na porta ${PORTA}`);
    console.log(`📍 Link local: http://localhost:${PORTA}`);
    console.log(`🌍 Ambiente atual: ${process.env.NODE_ENV || 'desenvolvimento'}\n`);
  });

  const finalizarServidor = () => {
    console.log('\n🔴 Encerrando o servidor...');
    server.close(() => {
      console.log('👋 Servidor finalizado.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', finalizarServidor);
  process.on('SIGINT', finalizarServidor);
};

iniciarServidor();

module.exports = app;
