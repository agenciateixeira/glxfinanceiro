# 🏦 Gestão Pessoal GLX

Sistema de gestão financeira inteligente para casais, com importação automática de faturas, categorização com IA e autenticação biométrica.

---

## 🚀 FASE 1 - COMPLETA ✅

### O que foi implementado:

#### ✅ Setup Base
- ✅ Projeto Next.js 16 com TypeScript
- ✅ Tailwind CSS configurado
- ✅ PWA (Progressive Web App) configurado
- ✅ Estrutura de pastas organizada

#### ✅ Autenticação
- ✅ Integração com Supabase Auth
- ✅ Login/Cadastro com email e senha
- ✅ **Face ID / Touch ID pronto** (WebAuthn)
- ✅ Persistência de sessão automática
- ✅ Middleware de proteção de rotas

#### ✅ Interface
- ✅ Tela de Login com **Particles.js** (fundo animado)
- ✅ Design System completo (cores pastéis)
- ✅ Dashboard placeholder
- ✅ Animações suaves (fadeIn, float, etc)
- ✅ Responsivo mobile-first

---

## 🖥️ Como rodar o projeto:

\`\`\`bash
cd gestao-glx
npm install
npm run dev
\`\`\`

Acesse: **http://localhost:3000**

---

## 📱 Como testar Face ID:

### No iPhone (Safari):
1. Acesse o app via Safari
2. Faça login com email/senha na primeira vez
3. Sistema vai perguntar se quer ativar Face ID
4. Aceite e faça a autenticação com Face ID
5. Na próxima vez, login será automático com Face ID

### Pré-requisitos:
- iPhone com Face ID ou Touch ID
- iOS Safari (Chrome não suporta WebAuthn no iOS)
- HTTPS (em produção) ou localhost (em dev)

---

**Desenvolvido com ❤️ para melhorar a gestão financeira de casais**

🚀 **Fase 1 completa! Pronto para iniciar Fase 2!**
