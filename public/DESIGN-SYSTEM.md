# DESIGN SYSTEM - GESTÃO PESSOAL GLX

## 1. PALETA DE CORES

### 1.1 Cores Principais

```css
/* Cores Base */
--background: #FFFFFF;           /* Branco puro para fundo principal */
--background-secondary: #F8F9FA; /* Cinza clarinho para contraste suave */

/* Cores Pastéis para Cards e Componentes */
--pastel-brown: #D4C5B9;        /* Marrom pastel suave */
--pastel-beige: #E8DDD0;        /* Bege pastel */
--pastel-sage: #C9D4C8;         /* Verde sálvia pastel */
--pastel-lavender: #D9D4E7;     /* Lavanda pastel */
--pastel-peach: #F5D5CB;        /* Pêssego pastel */
--pastel-blue: #C8DAE3;         /* Azul pastel */
--pastel-mint: #D5E8E0;         /* Menta pastel */
--pastel-pink: #F0D9E3;         /* Rosa pastel */

/* Cores de Texto */
--text-primary: #2C2C2C;        /* Quase preto para textos principais */
--text-secondary: #6B7280;      /* Cinza médio para textos secundários */
--text-muted: #9CA3AF;          /* Cinza claro para textos discretos */

/* Cores de Estado */
--success: #A8D5BA;             /* Verde pastel para sucesso */
--warning: #F5D5A8;             /* Amarelo pastel para avisos */
--error: #F5B5B5;               /* Vermelho pastel para erros */
--info: #B5D9F5;                /* Azul pastel para informações */

/* Cores de Acento */
--accent-primary: #B4A5A5;      /* Marrom rosado suave */
--accent-secondary: #A5B4B4;    /* Verde acinzentado suave */

/* Bordas e Divisores */
--border-light: #E5E7EB;        /* Borda suave */
--border-medium: #D1D5DB;       /* Borda média */
--shadow: rgba(44, 44, 44, 0.08); /* Sombra suave */
```

---

## 2. TIPOGRAFIA

### 2.1 Fontes

```css
/* Fonte Principal */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Fonte Secundária (números, valores) */
--font-secondary: 'DM Sans', sans-serif;

/* Fonte Mono (códigos, dados) */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 2.2 Tamanhos

```css
/* Tamanhos de Texto */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Pesos */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 3. ESPAÇAMENTO

```css
/* Sistema de Espaçamento (múltiplos de 4px) */
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-10: 2.5rem;  /* 40px */
--spacing-12: 3rem;    /* 48px */
--spacing-16: 4rem;    /* 64px */
--spacing-20: 5rem;    /* 80px */
```

---

## 4. BORDAS E SOMBRAS

```css
/* Border Radius */
--radius-sm: 0.375rem;   /* 6px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px */
--radius-full: 9999px;   /* Circle */

/* Sombras */
--shadow-sm: 0 1px 2px 0 rgba(44, 44, 44, 0.05);
--shadow-md: 0 4px 6px -1px rgba(44, 44, 44, 0.08),
             0 2px 4px -1px rgba(44, 44, 44, 0.04);
--shadow-lg: 0 10px 15px -3px rgba(44, 44, 44, 0.08),
             0 4px 6px -2px rgba(44, 44, 44, 0.04);
--shadow-xl: 0 20px 25px -5px rgba(44, 44, 44, 0.08),
             0 10px 10px -5px rgba(44, 44, 44, 0.03);
--shadow-2xl: 0 25px 50px -12px rgba(44, 44, 44, 0.15);

/* Sombra de Card Especial (suave e elegante) */
--shadow-card: 0 2px 8px rgba(44, 44, 44, 0.06),
               0 1px 2px rgba(44, 44, 44, 0.04);
```

---

## 5. ANIMAÇÕES E TRANSIÇÕES

```css
/* Durações */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;
--duration-slower: 500ms;

/* Easing Functions */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-smooth: cubic-bezier(0.25, 0.25, 0.75, 0.75);

/* Transições Padrão */
--transition-base: all var(--duration-normal) var(--ease-in-out);
--transition-colors: color var(--duration-fast) var(--ease-in-out),
                     background-color var(--duration-fast) var(--ease-in-out),
                     border-color var(--duration-fast) var(--ease-in-out);
```

---

## 6. COMPONENTES - ESTILOS BASE

### 6.1 Cards

```css
.card {
  background: var(--background);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-card);
  transition: var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

/* Cards com cores pastéis */
.card--brown { background: var(--pastel-brown); }
.card--beige { background: var(--pastel-beige); }
.card--sage { background: var(--pastel-sage); }
.card--lavender { background: var(--pastel-lavender); }
.card--peach { background: var(--pastel-peach); }
.card--blue { background: var(--pastel-blue); }
.card--mint { background: var(--pastel-mint); }
.card--pink { background: var(--pastel-pink); }
```

### 6.2 Botões

```css
.btn {
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  font-size: var(--text-base);
  transition: var(--transition-colors);
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--accent-primary);
  color: var(--text-primary);
}

.btn-primary:hover {
  background: #A59595;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--pastel-sage);
  color: var(--text-primary);
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-medium);
  color: var(--text-secondary);
}
```

### 6.3 Inputs

```css
.input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--background);
  transition: var(--transition-colors);
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(180, 165, 165, 0.1);
}

.input::placeholder {
  color: var(--text-muted);
}
```

---

## 7. TELA DE LOGIN - ESPECIFICAÇÕES

### 7.1 Conceito Visual

**Opção Escolhida**: **Partículas Flutuantes 3D com Particles.js** (mais leve que Three.js)

**Motivo**:
- Menos pesado que sistema solar 3D completo
- Animação suave e elegante
- Não distrai do formulário de login
- Compatível com PWA (performance)

### 7.2 Estrutura HTML

```html
<div class="login-container">
  <!-- Background animado -->
  <div id="particles-bg"></div>

  <!-- Formulário centralizado -->
  <div class="login-card">
    <div class="login-header">
      <img src="/public/logo.png" alt="GLX Logo" class="logo">
      <h1>Bem-vindo ao GLX</h1>
      <p>Gestão financeira inteligente para casais</p>
    </div>

    <form class="login-form">
      <!-- Inputs aqui -->
    </form>
  </div>
</div>
```

### 7.3 CSS do Login

```css
.login-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #F8F9FA 0%, #E8DDD0 100%);
  overflow: hidden;
}

#particles-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  opacity: 0.4;
}

.login-card {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-12);
  box-shadow: var(--shadow-2xl);
  max-width: 420px;
  width: 90%;
  animation: fadeInUp 0.6s var(--ease-out);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: var(--spacing-4);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.login-header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-2);
}

.login-header p {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
```

### 7.4 Configuração Particles.js

```javascript
// particles-config.js
export const particlesConfig = {
  particles: {
    number: {
      value: 60,
      density: {
        enable: true,
        value_area: 800
      }
    },
    color: {
      value: ["#D4C5B9", "#C9D4C8", "#D9D4E7", "#F5D5CB"]
    },
    shape: {
      type: "circle"
    },
    opacity: {
      value: 0.3,
      random: true,
      anim: {
        enable: true,
        speed: 1,
        opacity_min: 0.1,
        sync: false
      }
    },
    size: {
      value: 3,
      random: true,
      anim: {
        enable: true,
        speed: 2,
        size_min: 0.3,
        sync: false
      }
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#B4A5A5",
      opacity: 0.2,
      width: 1
    },
    move: {
      enable: true,
      speed: 1,
      direction: "none",
      random: true,
      straight: false,
      out_mode: "out",
      bounce: false
    }
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: {
        enable: true,
        mode: "grab"
      },
      resize: true
    },
    modes: {
      grab: {
        distance: 140,
        line_linked: {
          opacity: 0.5
        }
      }
    }
  },
  retina_detect: true
};
```

---

## 8. CARTÃO DE CRÉDITO - FLIP ANIMADO

### 8.1 HTML Estrutura

```html
<div class="credit-card-wrapper">
  <div class="credit-card" id="card">
    <!-- Frente do Cartão -->
    <div class="card-face card-front">
      <div class="card-chip"></div>
      <div class="card-number">•••• •••• •••• ••••</div>
      <div class="card-info">
        <div class="card-holder">SEU NOME</div>
        <div class="card-expiry">••/••</div>
      </div>
      <div class="card-brand">VISA</div>
    </div>

    <!-- Verso do Cartão -->
    <div class="card-face card-back">
      <div class="card-stripe"></div>
      <div class="card-cvv">
        <label>CVV</label>
        <div>•••</div>
      </div>
    </div>
  </div>
</div>
```

### 8.2 CSS do Cartão

```css
.credit-card-wrapper {
  perspective: 1000px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.credit-card {
  position: relative;
  width: 100%;
  height: 250px;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
}

.credit-card.flip {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  backface-visibility: hidden;
  box-shadow: var(--shadow-xl);
  transform-style: preserve-3d;
}

.card-front {
  background: linear-gradient(135deg,
    var(--pastel-brown) 0%,
    var(--accent-primary) 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-back {
  background: linear-gradient(135deg,
    var(--accent-secondary) 0%,
    var(--pastel-sage) 100%);
  transform: rotateY(180deg);
}

.card-chip {
  width: 50px;
  height: 40px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: var(--radius-sm);
  position: relative;
}

.card-chip::before {
  content: '';
  position: absolute;
  top: 5px;
  left: 5px;
  right: 5px;
  bottom: 5px;
  background: linear-gradient(135deg, #FFC700 0%, #FF8C00 100%);
  border-radius: 2px;
}

.card-number {
  font-size: var(--text-2xl);
  font-family: var(--font-mono);
  letter-spacing: 2px;
  color: var(--text-primary);
  text-align: center;
  margin: var(--spacing-4) 0;
}

.card-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.card-holder {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-primary);
}

.card-expiry {
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.card-brand {
  position: absolute;
  top: var(--spacing-6);
  right: var(--spacing-6);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

/* Verso */
.card-stripe {
  width: calc(100% + var(--spacing-12));
  height: 50px;
  background: var(--text-primary);
  margin: var(--spacing-4) calc(-1 * var(--spacing-6)) var(--spacing-8);
}

.card-cvv {
  background: var(--background);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  text-align: right;
}

.card-cvv label {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-1);
}

.card-cvv div {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  color: var(--text-primary);
}
```

---

## 9. SISTEMA SEM LOADING (SKELETON SCREENS)

**Substituir telas de loading por Skeleton Screens** = Melhor UX

### 9.1 Conceito

Ao invés de mostrar um loading, mostramos a "estrutura" da página com placeholders animados.

### 9.2 Skeleton CSS

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--background-secondary) 25%,
    #F0F0F0 50%,
    var(--background-secondary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Skeleton específicos */
.skeleton-text {
  height: 16px;
  margin-bottom: var(--spacing-2);
}

.skeleton-title {
  height: 24px;
  width: 60%;
  margin-bottom: var(--spacing-4);
}

.skeleton-card {
  height: 120px;
  border-radius: var(--radius-xl);
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
}
```

### 9.3 Exemplo de Uso

```html
<!-- Ao invés de loading spinner -->
<div class="dashboard-loading">
  <div class="skeleton skeleton-title"></div>
  <div class="skeleton skeleton-text"></div>
  <div class="skeleton skeleton-text" style="width: 80%;"></div>

  <div class="cards-grid">
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  </div>
</div>
```

---

## 10. CATEGORIAS - SISTEMA DE ÍCONES E CORES

### 10.1 Mapeamento Categoria → Cor Pastel

```javascript
export const categoryColors = {
  // Despesas
  'Moradia': { color: 'var(--pastel-brown)', icon: '🏠' },
  'Alimentação': { color: 'var(--pastel-peach)', icon: '🍔' },
  'Transporte': { color: 'var(--pastel-blue)', icon: '🚗' },
  'Saúde': { color: 'var(--pastel-mint)', icon: '⚕️' },
  'Educação': { color: 'var(--pastel-lavender)', icon: '📚' },
  'Lazer': { color: 'var(--pastel-pink)', icon: '🎉' },
  'Vestuário': { color: 'var(--pastel-sage)', icon: '👔' },
  'Contas': { color: 'var(--pastel-beige)', icon: '💡' },
  'Pets': { color: 'var(--pastel-mint)', icon: '🐾' },
  'Outros': { color: 'var(--background-secondary)', icon: '📦' },

  // Receitas
  'Salário': { color: 'var(--success)', icon: '💰' },
  'Freelance': { color: 'var(--pastel-blue)', icon: '💻' },
  'Investimentos': { color: 'var(--info)', icon: '📈' },
};
```

---

## 11. RESPONSIVIDADE

### 11.1 Breakpoints

```css
/* Mobile First */
--breakpoint-sm: 640px;   /* Small devices */
--breakpoint-md: 768px;   /* Medium devices */
--breakpoint-lg: 1024px;  /* Large devices */
--breakpoint-xl: 1280px;  /* Extra large devices */
--breakpoint-2xl: 1536px; /* 2X large devices */
```

### 11.2 Media Queries Helper

```css
/* Mobile (padrão) */
.container {
  padding: var(--spacing-4);
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: var(--spacing-6);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-8);
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

---

## 12. PWA - MANIFEST.JSON

```json
{
  "name": "Gestão Pessoal GLX",
  "short_name": "GLX",
  "description": "Gestão financeira inteligente para casais",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#D4C5B9",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/public/pwa.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/public/pwa.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

## 13. RESUMO DA IDENTIDADE VISUAL

### 13.1 Características do Design

- **Minimalista e Clean**: Muito espaço em branco, sem poluição visual
- **Pastéis Suaves**: Cores calmas que não cansam a vista
- **Tipografia Clara**: Fontes modernas e legíveis
- **Animações Sutis**: Transições suaves, sem exageros
- **Sem Loading Tradicional**: Skeleton screens para melhor UX
- **Foco no Conteúdo**: Design serve o conteúdo, não compete com ele

### 13.2 Mood Board (Referências Visuais)

- **Estilo**: Neomorfismo suave + Glassmorphism discreto
- **Inspiração**: Notion, Linear, Stripe Dashboard
- **Sensação**: Calmo, organizado, confiável, elegante

---

**Próximo Passo**: Implementar estrutura base do projeto com estas definições de design!
