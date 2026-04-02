# ⚙️ Guia Técnico Biblio Verso: Engenharia e Lógica (Apresentação Enrique)

Este manual detalha o **como** o Biblio Verso foi implementado, abordando a lógica de backend, banco de dados, segurança e animações.

---

## 🚀 Arquitetura Mestra: Smart Backend & Dumb Interfaces
O ponto mais alto da engenharia deste projeto é a separação total entre o **Cérebro (Backend)** e as **Interfaces (Web e CLI)**. 

### O Conceito "Dumb Interface"
Nenhuma lógica de negócio, cálculo de multa ou validação de RPG acontece no Frontend ou no Terminal. Ambas as interfaces são **burras**: elas servem apenas para coletar inputs do usuário e renderizar as saídas que o Backend envia.
- **Vantagem**: Posso criar 10 interfaces diferentes (Mobile, Desktop, Web, Totem) e todas seguirão exatamente as mesmas regras de negócio sem eu precisar reescrever uma linha de lógica de servidor.

### Dual Interface (Web vs Terminal)
Temos duas interfaces interligadas rodando em ecossistemas diferentes:
1. **Web Frontend**: HTML/JS puro com animações de alto nível.
2. **CLI (Command Line Interface)**: Um terminal interativo em Node.js.

Ambas consomem a mesma **API REST**. O que você altera no terminal reflete no site em tempo real, provando que o Backend é a única fonte da verdade.

---

## 🔐 1. Autenticação e Sessão (Stateless JWT)
O sistema opera em uma arquitetura **Stateless** (sem estado no servidor).
- **Código de Login**: 
    ```typescript
    const token = jwt.sign({ id: user.id, tipo: user.tipo }, process.env.JWT_SECRET, { expiresIn: '24h' });
    ```
- **Lógica**: O servidor gera um token JWT assinado digitalmente. O frontend armazena no `sessionStorage`. O middleware `src/middlewares/auth.ts` intercepta cada requisição, valida o token e injeta as permissões (`currentUser.is_admin`) no objeto `req` do Express. Isso impede qualquer acesso a rotas de escrita sem um token válido e íntegro.

## 📚 2. Acervo Físico (Estrutura Relacional 1:N)
O banco de dados separa a **Obra** (`livros`) dos **Exemplares** (`exemplares`).
- **Implementação**: 
    ```typescript
    const exemplaresDisponiveis = await db('exemplares')
        .where({ livro_id: id, disponibilidade: 'disponivel' })
        .count('id as total');
    ```
- **Lógica**: Quando o bibliotecário busca um livro, o sistema realiza um `JOIN` ou uma subquery para contar em tempo real quantos exemplares físicos daquela obra estão livres. A localização física (Corredor e Prateleira) é um atributo do exemplar, não do livro, permitindo que a mesma obra esteja em vários locais da biblioteca simultaneamente.

### 🛡️ Regra de Integridade: Bloqueio de Exclusão
Implementamos uma trava de segurança que impede o administrador de remover um livro se houver pendências ativas:
```typescript
const [{ totalAtivos }] = await db('alugueis')
    .where({ livro_id: id })
    .whereIn('status', ['ativo', 'atrasado'])
    .count('id as totalAtivos');

if (Number(totalAtivos) > 0) return res.status(400).json({ error: `❌ Bloqueio: Este livro possui ${totalAtivos} empréstimo(s) pendente(s) de devolução.` });
```
**Por que?**: Isso evita "registros órfãos" no banco de dados e garante que o patrimônio da escola só possa ser removido do catálogo se todas as cópias físicas estiverem de fato nas prateleiras.

## 📱 3. Acervo Digital (File Storage & State-Machine)
A gestão de PDFs utiliza estados para garantir a qualidade do conteúdo.
- **Implementação de Curadoria**: 
    ```typescript
    const status = ehBibliotecario ? 'aprovado' : 'pendente';
    await db('acervo_digital').insert({ ...dadosPDF, status });
    ```
- **Rejeição (Hard Delete)**: 
    ```typescript
    await db('acervo_digital').where({ id, status: 'pendente' }).delete();
    ```
- **Lógica**: Diferente de livros físicos, um livro digital pendente ainda não possui histórico de leitura. Por isso, se o bibliotecário rejeitar a submissão, o sistema realiza um **Hard Delete** (exclusão permanente), mantendo o banco de dados limpo e sem resíduos de arquivos não homologados.

## 📋 4. Empréstimos e Multas (Atomização & Date Math)
Este é o módulo mais crítico e utiliza **Transações SQL** para garantir a consistência absoluta.
- **Cálculo da Multa (Backend)**: 
    ```typescript
    const diffMilis = hoje.getTime() - dataPrevista.getTime();
    const diasAtraso = Math.floor(diffMilis / (1000 * 60 * 60 * 24));
    if (diasAtraso > 0) const valorMulta = diasAtraso * 1.00;
    ```
- **Atomização**: Usamos `await db.transaction(async (trx) => { ... })`. Se o aluguel for bem-sucedido, mas a atualização do estoque falhar, o Knex faz o rollback automático de tudo. O cálculo de multas é feito comparando milissegundos UTC entre a devolução e o prazo prometido.

## 🎓 5. Espaço Literário RPG (Smart Backend Security)
O RPG foi desenhado para ser invulnerável a trapaças via navegador.
- **Implementação Anti-Cheat**: 
    ```typescript
    // No Controller, removemos a resposta certa do objeto JSON
    const dataResponse = { ...lessonData };
    delete dataResponse.quiz.a; 
    res.json(dataResponse);
    ```
- **Lógica**: O frontend é "burro". Ele recebe as perguntas, mas nunca a resposta correta. Quando o aluno clica em uma opção, o sistema envia o `index` da escolha para o backend. O backend carrega o gabarito real do banco e faz a comparação em segredo, devolvendo apenas se acertou ou errou. O XP e os corações são atualizados diretamente no banco de dados, impedindo manipulação via console.

## 👥 6. Controle de Usuários (Gerenciamento de Roles)
A gestão de privilégios é centralizada na tabela `usuarios`.
- **Implementação de Bloqueio**: 
    ```typescript
    await db('usuarios').where({ id }).update({ bloqueado: true, motivo_bloqueio: '...' });
    ```
- **Lógica**: O sistema de permissões verifica o campo `bloqueado` em cada middleware de escrita. Um usuário bloqueado tem seu token JWT ainda válido para leitura, mas recebe um erro `403 Forbidden` ao tentar realizar qualquer ação ativa no sistema.

## 📊 7. Estatísticas (Agregações & Data Intelligence)
Dashboard alimentado por consultas de agregação do MySQL.
- **Implementação**: 
    ```typescript
    const topGeneros = await db('alugueis')
        .join('livros', 'alugueis.livro_id', 'livros.id')
        .select('livros.genero').count('alugueis.id as total')
        .groupBy('genero');
    ```
- **Lógica**: O frontend consome o endpoint `/api/stats`, que executa `GROUP BY` e `COUNT` em tempo real. Os dados são mapeados para a biblioteca **Chart.js**, gerando visualizações interativas.

## 🪐 8. Interface Premium (GSAP & Three.js)
A "magia" visual é feira com animação de alto desempenho.
- **Transições GSAP**: 
    ```javascript
    gsap.fromTo(".screen-active", { opacity: 0, x: -20 }, { opacity: 1, x: 0, stagger: 0.1 });
    ```
- **Fundo 3D (MutationObserver)**: 
    ```javascript
    new MutationObserver(() => {
        // Altera a cor dos vértices do PointMaterial do Three.js sem re-renderizar a cena
        material.color.setHex(isDark ? themeColors.gold : themeColors.blue);
    }).observe(document.documentElement, { attributes: true });
    ```
- **Lógica**: O MutationObserver vigia mudanças no atributo `data-theme`. Quando o tema muda, ele avisa a engine do Three.js para atualizar o tom das partículas estelares, garantindo uma transição de cores fluida e suave.
