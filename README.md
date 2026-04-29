# 📚 Biblio Verso - Sistema de Biblioteca Premium

O **Biblio Verso** é uma solução completa e moderna para a gestão de acervos físicos e digitais. Desenvolvido com foco em alta performance, estética refinada e experiência de usuário fluida, o sistema atende tanto a bibliotecas institucionais quanto a leitores apaixonados.

---

## 🚀 Projeto Online
Acesse a versão de produção hospedada no Render:  
**[https://biblioteca-backend-frontend.onrender.com/](https://biblioteca-backend-frontend.onrender.com/)**

> **Acesso Administrativo Padrão:**
> - **E-mail:** `admin@admin.com`
> - **Senha:** `admin123`

---

## 🛠️ Tecnologias Utilizadas

### Backend (O Cérebro)
- **Node.js + Express.js**: Estrutura robusta e escalável.
- **Socket.io**: Comunicação em tempo real para notificações e estatísticas.
- **Autenticação**: JSON Web Tokens (JWT) para sessões seguras e stateless.
- **Segurança**: Criptografia de senhas com `bcryptjs`.

### Frontend (A Face)
- **Vanilla Tech**: HTML5, CSS3 e JavaScript (ES6+) puros.
- **Animações**: `GSAP` para transições suaves e profissionais.
- **Gráficos**: `Chart.js` para visualização de dados e KPIs.
- **Efeitos 3D**: `Three.js` para uma experiência imersiva no Espaço Infantil.

### Banco de Dados (O Coração)
- **Modo Offline**: `better-sqlite3` para desenvolvimento local 100% independente de internet.
- **Modo Online**: `Supabase` (PostgreSQL) para alta disponibilidade e persistência na nuvem.

---

## ⚙️ Configuração de Ambientes

O Biblio Verso foi projetado para ser híbrido, funcionando perfeitamente em sua máquina local ou em servidores de produção.

### 🏠 Como Rodar Localmente (Modo Offline)
Ideal para desenvolvimento, testes ou uso em redes sem internet.

1. **Instalar Dependências:**
   ```bash
   npm install
   ```
2. **Configurar Ambiente:**
   - Copie o arquivo `.env.example` para `.env`.
   - Certifique-se de que `APP_MODE=offline`.
3. **Inicializar o Banco de Dados:**
   ```bash
   npm run setup
   ```
4. **Iniciar o Servidor:**
   ```bash
   npm run dev
   ```
5. **Acessar:** [http://localhost:3000](http://localhost:3000)

### ☁️ Como Rodar Online (Modo Produção/Render)
Para hospedar o sistema para múltiplos usuários na internet.

1. **Deploy:** Faça o push do código para seu repositório GitHub vinculado ao Render.
2. **Configurar Variáveis de Ambiente no Painel do Render:**
   - `NODE_ENV=production`
   - `PORT=10000`
   - `APP_MODE=online`
   - `SUPABASE_URL`: URL do seu projeto no Supabase.
   - `SUPABASE_ANON_KEY`: Sua chave anônima.
   - `SUPABASE_SERVICE_ROLE_KEY`: Sua chave de serviço (necessária para gestão de usuários).
   - `CORS_ORIGIN`: URL final do seu site (ex: `https://seu-app.onrender.com`).
   - `JWT_SECRET`: Uma chave secreta longa e segura.

---

## 📖 Documentação e Scripts

- `npm run setup`: Cria e limpa a estrutura do banco SQLite local.
- `npm run dev`: Inicia o servidor local com monitoramento automático de mudanças.
- `npm start`: Comando oficial de inicialização (usado pelo Render).

Para mais detalhes técnicos sobre a arquitetura, regras de negócio e design system, consulte a [Documentação Técnica Completa](docs/DOCUMENTACAO_TECNICA.md).

---

## ✨ Autores
- **Enrique** - Arquiteto de Software & Engenheiro Backend/Frontend
- **Julia** - UI/UX Designer & Estrategista de Produto

---
*Este projeto foi desenvolvido como Trabalho Final de Curso, unindo tecnologia de ponta com um design centrado no usuário.*
