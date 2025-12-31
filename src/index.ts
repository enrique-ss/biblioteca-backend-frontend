import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './database';

// Importação das Rotas
import authRoutes from './routes/authRoutes';
import livroRoutes from './routes/LivroRoutes';
import aluguelRoutes from './routes/aluguelRoutes';

// Importação de Controllers para rotas avulsas
import { UsuarioController } from './controllers/UsuarioController';
import { authMiddleware, bibliotecarioMiddleware } from './middlewares/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globais
app.use(cors());
app.use(express.json());

// ========== DEFINIÇÃO DOS ENDPOINTS ==========

// 1. Autenticação (Login e Registro)
app.use('/api/auth', authRoutes);

// 2. Livros (Listar, Criar, Editar, Deletar)
app.use('/api/livros', livroRoutes);

// 3. Aluguéis (Alugar, Meus Aluguéis, Devolver)
app.use('/api/alugueis', aluguelRoutes);

// 4. Usuários (Rotas que ficaram fora dos grupos acima)
app.get('/api/usuarios/perfil', authMiddleware, UsuarioController.perfil);
app.get('/api/usuarios', authMiddleware, bibliotecarioMiddleware, UsuarioController.listar);

// 5. Health Check (Obrigatório para o CLI funcionar)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API Biblioteca funcionando!',
    timestamp: new Date().toISOString()
  });
});

// 6. Rota 404 (Tratamento de rotas inexistentes)
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada no servidor profissional' });
});

// ========== INICIALIZAÇÃO ==========

const startServer = async () => {
  try {
    // Testa conexão com o banco de dados
    await db.raw('SELECT 1');
    
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.clear();
      console.log('════════════════════════════════════════════════');
      console.log('   🚀 SERVIDOR REESTRUTURADO E ONLINE');
      console.log('════════════════════════════════════════════════');
      console.log(`✅ Banco de Dados: Conectado`);
      console.log(`🌐 URL Base: http://127.0.0.1:${PORT}/api`);
      console.log('════════════════════════════════════════════════');
      console.log('\n👉 O CLI já pode se conectar agora.\n');
    });
  } catch (error) {
    console.error('❌ Falha crítica ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer();