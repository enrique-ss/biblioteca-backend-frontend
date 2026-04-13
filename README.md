# Biblio Verso — Sistema de Biblioteca Premium

Sistema completo para gestão de acervo físico e **digital**, com arquitetura moderna em Node.js, autenticação Supabase e interface web de alto desempenho.

## 🚀 Como rodar localmente

1. **Configurar variáveis de ambiente**
   - Copie `.env.example` para `.env`
   - Configure as variáveis do Supabase (URL, ANON_KEY, SERVICE_ROLE_KEY)

2. **Configurar banco de dados no Supabase**
   - Execute o SQL do arquivo `setup.sql` no SQL Editor do Supabase
   - Isso cria todas as tabelas necessárias
   - Crie usuários padrão no Supabase Auth (admin@admin.com/admin123, user@user.com/user123)

3. **Instalar dependências**
   ```bash
   npm install
   ```

4. **Opções de execução**
   ```bash
   npm run setup  # Drop/criar tabelas no Supabase
   npm run dev    # Iniciar servidor (porta 3000)
   npm run full   # Setup + dev (recomendado)
   npm start      # Iniciar servidor
   ```

5. **Acessar**
   - Backend: http://localhost:3000

## ✨ O que o sistema faz

- **Acervo Híbrido**: Gestão de livros físicos (com controle de exemplares e localização) e livros digitais (streaming de PDFs com capas personalizadas).
- **Autoatendimento**: Leitores consultam acervo, renovam empréstimos online e quitam multas via interface web.
- **Gestão Administrativa**: Bibliotecários controlam estoque, processam devoluções com avaliação de estado físico e gerenciam bloqueios de usuários.
- **Ecossistema Inteligente**: Cálculo automático de multas (R$ 1,00/dia), prazos de 14 dias e centro de notificações unificado para pendências críticas.
- **Experiência Premium**: Interface Web com Glassmorphism, suporte nativo a Dark/Light mode e micro-animações.

## 🔑 Regras de acesso

- **Usuário comum**: Criado automaticamente com tipo 'usuario' ao se registrar
- **Administrador**: Criado manualmente no Supabase Auth com tipo 'bibliotecario'
- **Segurança**: Autenticação via Supabase Auth nativo (sem JWT)

## 🛠️ Arquitetura e Engenharia

- **Frontend Web**: SPA (Single Page Application), Vanilla JS, CSS3 (Mobile First), GSAP, Three.js
- **Backend API**: Node.js, Express, Supabase Client, RESTful, Socket.io
- **Banco de Dados**: Supabase (PostgreSQL) com Supabase Auth
- **Segurança**: Supabase Auth, RBAC (Access Control)

---

Desenvolvido por **Luiz Enrique**.
