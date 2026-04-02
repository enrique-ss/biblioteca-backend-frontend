# 🎨 Padrões de Frontend e Design UI/UX: Biblio Verso

Esta documentação descreve os fundamentos visuais e técnicos que tornam a interface do **Biblio Verso** uma experiência moderna, fluida e imersiva.

---

## 1. Conceito Visual: "Modern Premium"
O sistema adota uma estética minimalista de alto contraste, inspirada em dashboards de tecnologia de ponta.
- **Micro-interações**: Cada botão ou card possui transições de 200ms a 400ms para suavizar a interação.
- **Glassmorphism**: Aplicação de `backdrop-filter: blur(12px)` em modais e cards, criando uma profundidade de camadas que destaca o conteúdo sobre o fundo animado.
- **High Contrast**: Fundo ultra-escuro (`#0a0a0a`) com textos em tons frios de branco e acentos em verde vibrante (`#00d68f`).

---

## 2. Design Tokens (Variáveis CSS Nativas)

Toda a consistência visual é mantida através de variáveis em `base.css` e `components.css`. Isso permite mudar a identidade visual de todo o projeto em segundos.

### Paleta Estratégica:
- `--accent`: `#00d68f` (Ações principais e sucesso).
- `--surface-1`: `#161616` (Cards de conteúdo).
- `--border-s`: `rgba(255, 255, 255, 0.08)` (Bordas sutis para separação).
- `--gradient-primary`: `linear-gradient(135deg, var(--accent), #00a36c)` (Usado em botões e barras de progresso).

### Tipografias Combinadas:
- **Serif (Cinzel/Playfair)**: Usada em títulos de seções para remeter à elegância clássica das bibliotecas físicas.
- **Sans-Serif (Inter/Roboto)**: Usada no corpo do texto para leitura rápida e clareza técnica.

---

## 3. Engine de Animações (GSAP & Three.js)

Para evitar carinhas estáticas e "robotizadas", o projeto utiliza bibliotecas profissionais de movimento:

1.  **GSAP (GreenSock Animation Platform)**:
    - Gerencia as entradas de cada tela (`opacity: 0` -> `1` com `y: 20`).
    - Anima as barras de progresso do Espaço Literário e as subidas de nível com curvas matemáticas reais (bezieres).
2.  **Three.js**:
    - Responsável pelo **Fundo Dinâmico**. Renderiza uma malha poligonal acelerada por GPU que se move sutilmente, criando uma sensação de "vida" constante na interface.

---

## 4. O Padrão "Dumb Rendering" (Vanillajs)

Embora o sistema se comporte como um aplicativo moderno (React/Vue), ele é construído em **Vanilla JavaScript**. Adotamos padrões para manter o código limpo e evitarmos o "espaguete":

- **Template Strings**: Injeção dinâmica de cards e tabelas usando strings literais, facilitando a manutenção do HTML.
- **State Object**: Cada módulo (Livros, Perfil, Infantil) possui seu próprio objeto de `state` que sincroniza com o que o Backend devolve.
- **Debouncing**: Em buscas (`oninput`), o sistema espera 300ms antes de disparar a chamada para a API, reduzindo o fardo no servidor.
- **Axios Interceptors**: Gerenciam a injeção automática do Token JWT em todos os cabeçalhos HTTP de saída, tornando a autenticação invisível para o usuário.

---

## 5. Diretrizes de Responsividade
- **Grid Layout**: Uso intensivo de `display: grid` com `repeat(auto-fill, minmax(...))` para garantir que o acervo se adapte de monitores 4K até tablets.
- **Transitions**: Todo efeito visual (hover, active) é animado via hardware (`transform` e `opacity`) para garantir 60 FPS estáveis mesmo em dispositivos com menor desempenho gráfico.

---
