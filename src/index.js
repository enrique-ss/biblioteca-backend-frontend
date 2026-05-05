/**
 * SERVIDOR PRINCIPAL - Biblio Verso
 * Este é o ponto de entrada da aplicação. Aqui configuramos o servidor Express,
 * as comunicações em tempo real (Socket.io) e as rotas da API.
 */
const express = require('express'); // Framework para criar rotas e gerenciar requisições
const cors = require('cors'); // Permite que o frontend acesse a API de diferentes origens
const dotenv = require('dotenv'); // Carrega configurações de um arquivo secreto (.env)
const path = require('path'); // Ajuda a lidar com caminhos de pastas no computador
const http = require('http'); // Servidor básico de internet
const { Server } = require('socket.io'); // Tecnologia para atualizações em tempo real (comunicação bi-direcional)

/**
 * CONFIGURAÇÃO DE SEGURANÇA E INICIALIZAÇÃO
 * Aqui importamos as ferramentas de controle administrativo, identificamos se o sistema está
 * em modo de produção (online) ou desenvolvimento (local) e iniciamos o monitoramento de eventos.
 */
const { ensureDefaultAdmin } = require('./bootstrapAdmin'); // Garante que exista um administrador padrão
const { runtimeMode } = require('./database'); // Identifica se estamos rodando online (Supabase) ou offline (SQLite)
const { initMonitor } = require('./monitor'); // Inicializa o sistema de monitoramento inteligente

// Carrega as configurações do arquivo .env de forma silenciosa
dotenv.config({ quiet: true });

// Cria a aplicação principal e o servidor de internet
const app = express();
const server = http.createServer(app);

// --- CONFIGURAÇÃO DE ACESSO (CORS) ---
// Define quem pode acessar nossa API (geralmente o endereço do site)
const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: configuredCorsOrigins.length > 0 ? configuredCorsOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
};

// --- CONFIGURAÇÃO DO WEBSOCKET (SOCKET.IO) ---
// Ativa a comunicação em tempo real para o servidor
const io = new Server(server, {
  cors: corsOptions
});

// Deixa o "io" disponível para ser usado em outras partes do código
app.set('io', io);

// Define em qual porta o site vai rodar (padrão 3000)
const PORTA = process.env.PORT || 3000;

// Configurações básicas de segurança e processamento de dados
app.set('trust proxy', 1);
app.use(cors(corsOptions)); // Aplica as regras de acesso
app.use(express.json({ limit: '10mb' })); // Permite que o servidor entenda dados em formato JSON (até 10MB para fotos)
app.use(express.urlencoded({ limit: '10mb', extended: true })); // Permite entender dados de formulários pesados
app.use(express.static(path.join(__dirname, '../public'))); // Serve os arquivos do site (HTML, CSS, JS)

// --- IMPORTAÇÃO DAS ROTAS ---
// Aqui conectamos as diferentes partes do sistema (livros, usuários, aluguéis, etc)
const rotasAutenticacao = require('./routes/authRoutes');
const rotasLivros = require('./routes/LivroRoutes');
const rotasAlugueis = require('./routes/aluguelRoutes');
const rotasUsuarios = require('./routes/UsuarioRoutes');
const rotasEstatisticas = require('./routes/StatsRoutes');
const rotasAcervoDigital = require('./routes/AcervoDigitalRoutes');
const rotasInfantil = require('./routes/infantilRoutes');
const rotasAmizades = require('./routes/amizadeRoutes');
const rotasSociais = require('./routes/socialRoutes');

// --- DEFINIÇÃO DOS CAMINHOS DA API ---
app.use('/api/auth', rotasAutenticacao); // Login e cadastro
app.use('/api/livros', rotasLivros); // Gerenciamento de livros físicos
app.use('/api/alugueis', rotasAlugueis); // Controle de empréstimos
app.use('/api/usuarios', rotasUsuarios); // Cadastro de pessoas
app.use('/api/stats', rotasEstatisticas); // Painel de números e dados
app.use('/api/acervo-digital', rotasAcervoDigital); // PDFs e arquivos digitais
app.use('/api/infantil', rotasInfantil); // Área para as crianças
app.use('/api/amizades', rotasAmizades); // Sistema Social de Amigos
app.use('/api/social', rotasSociais); // Avaliações, Feed e Clubes de Leitura

// --- ROTAS GERAIS ---
// Verifica se o servidor está funcionando corretamente
app.get('/api/health', (req, res) => {
  res.json({
    message: 'API da Biblioteca Online (Biblio Verso)',
    version: '1.0.0',
    status: 'online',
    mode: runtimeMode
  });
});

// Envia a página principal (index.html) quando acessamos o endereço base
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Caso alguém tente acessar um caminho que não existe
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota nao encontrada',
    path: req.path
  });
});

// Gerenciador de erros: se algo der errado no servidor, ele avisa aqui
app.use((err, req, res, next) => {
  console.error('Erro nao tratado na aplicacao:', err);

  // Erro de tamanho de arquivo (Base64 muito grande)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Arquivo muito grande',
      message: 'A imagem selecionada ultrapassa o limite permitido (10MB). Tente uma imagem menor.'
    });
  }

  res.status(err.status || 500).json({
    error: 'Erro interno no servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um problema inesperado.'
  });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const iniciarServidor = async () => {
  // Cria o administrador se ele ainda não existir
  await ensureDefaultAdmin();

  // Configura a entrada de novos usuários no sistema de tempo real
  io.on('connection', (socket) => {
    socket.on('joinRoom', (room) => {
      socket.join(room);
    });
  });

  // Ativa o monitor de atividades
  initMonitor(io);

  // Faz o servidor começar a ouvir as chamadas na internet
  server.listen(PORTA, '0.0.0.0', () => {
    console.log(`Biblio Verso ativo em http://localhost:${PORTA} (${runtimeMode})`);
  });

  // Função para desligar o servidor de forma segura
  const finalizarServidor = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  // Escuta sinais do sistema para desligar
  process.on('SIGTERM', finalizarServidor);
  process.on('SIGINT', finalizarServidor);
};

// Começa tudo!
iniciarServidor();

// Exporta o aplicativo para possíveis testes
module.exports = app;
