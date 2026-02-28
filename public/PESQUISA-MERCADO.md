# GESTÃO PESSOAL GLX - Pesquisa de Mercado e Boas Práticas

## 1. ANÁLISE DO MERCADO DE APPS FINANCEIROS PARA CASAIS (2025)

### 1.1 Apps de Referência no Mercado Brasileiro

#### **ZapGastos** - Melhor App para Casal 2025
- Funciona diretamente no WhatsApp
- Registro automático de despesas
- Compartilhamento em tempo real
- **Diferencial**: Facilidade de uso e integração com app já utilizado diariamente

#### **Mobills** - Mais Completo
- Disponível em Android, iOS e Web
- Automação de categorização
- Visão consolidada de gastos
- Relatórios visuais detalhados
- **Diferencial**: Automação e visão consolidada

#### **Noh** - Solução Bancária Integrada
- Conta digital conjunta real
- Ambos depositam e pagam da mesma conta
- **Diferencial**: Vai além do app, oferece solução bancária completa

#### **Spendee** - Multi-Carteira
- Carteiras compartilhadas
- Conexão com bancos digitais
- Suporte a criptomoedas
- **Diferencial**: Visualização completa do patrimônio

#### **Splitwise** - Divisão de Despesas
- Focado exclusivamente em divisão
- Ideal para finanças separadas
- **Diferencial**: Simplicidade para quem não usa conta conjunta

#### **Minhas Economias**
- Gratuito e completo
- Controle detalhado por pessoa
- **Diferencial**: Gratuidade com recursos robustos

---

## 2. FUNCIONALIDADES ESSENCIAIS IDENTIFICADAS

### 2.1 Recursos Críticos para Sucesso
1. **Registro Rápido de Despesas** - Facilidade é fundamental para criar o hábito
2. **Categorização Automática** - Reduz trabalho manual e aumenta precisão
3. **Divisão Configurável** - Flexibilidade para despesas individuais vs compartilhadas
4. **Relatórios Visuais Claros** - Gráficos e dashboards intuitivos
5. **Criação de Metas Conjuntas** - Planejamento financeiro para o casal
6. **Sincronização em Tempo Real** - Ambos veem as atualizações instantaneamente

### 2.2 Estatística Importante
- **Mais de 50% dos casais brasileiros apontam as finanças como principal motivo de brigas no relacionamento** (Pesquisa Serasa)
- Isso valida a necessidade crítica de uma ferramenta eficiente

---

## 3. TECNOLOGIAS E ALGORITMOS DE CATEGORIZAÇÃO

### 3.1 AI Transaction Categorization (Estado da Arte)

#### **Machine Learning para Categorização**
- Usa **Pattern Recognition** e **Natural Language Processing (NLP)**
- Analisa detalhes da transação para classificar automaticamente
- Aprende com dados existentes para reconocer padrões
- Determina se é conta de utilidade, material de escritório, pagamento de cliente, etc.

#### **Algoritmos de Classificação**
- Classificam transações baseadas em características
- Aprendem de dados históricos
- Reconhecem padrões para determinar categorias
- Monitoramento em tempo real dos gastos

#### **Benefícios Comprovados**
- Redução de tempo de processamento em até **80%**
- Taxa de erro reduzida de 5% para **menos de 1%**
- Taxa de sucesso acima de **99%** em extração de dados

---

## 4. PARSING DE FATURAS E EXTRATOS (OCR + AI)

### 4.1 Tecnologias de Extração de Dados

#### **OCR (Optical Character Recognition)**
- Analisa faturas usando algoritmos de visão computacional
- Identifica caracteres e estrutura do documento
- NLP interpreta informações contextuais (saldos, transações, datas, valores)

#### **Processamento Inteligente de Documentos**
- Combina **AI + OCR + NLP**
- Transforma dados não estruturados em formato estruturado
- PaddleOCR: toolkit open-source que suporta 80+ idiomas

#### **Técnicas de Parsing**

**1. Rule-based Parsing (Baseado em Regras)**
- Encontra frases como "Número de Conta", "Valor Total"
- Captura o token ou linha seguinte
- Ideal para formatos padronizados

**2. Table Extraction (Extração de Tabelas)**
- Detecta tabelas via OpenCV (detecção de bordas e análise de contornos)
- Realiza OCR em cada célula
- Ideal para faturas com layout tabular

**3. Machine Learning Approach**
- Usa algoritmos de ML avançados
- Lê, interpreta e converte texto impresso/manuscrito
- Aprende com padrões para melhorar precisão

#### **Performance Real**
- Redução de tempo de processamento: **até 80%**
- Taxa de erro: de 5% para **< 1%**
- Taxa de sucesso: **> 99%**

### 4.2 Ferramentas de Referência
- **Parsio**: OCR para extratos bancários
- **Veryfi**: API de OCR para extratos
- **DocuClipper**: Conversão para Excel, CSV, QuickBooks
- **Parseur**: AI-powered OCR
- **PaddleOCR**: Open-source toolkit

---

## 5. PWA (PROGRESSIVE WEB APP) - BOAS PRÁTICAS

### 5.1 Por que PWA é Ideal para Finanças?

#### **Segurança**
- Opera sobre **HTTPS** para proteção contra ataques
- Comunicação criptografada entre cliente e servidor
- Crítico para transações financeiras

#### **Vantagens Técnicas**
- Soluções web de alta tecnologia
- Experiência de usuário segura, eficiente e confiável
- Funciona offline (com Service Workers)
- Instalável como app nativo no celular
- Atualizações automáticas sem lojas de apps
- Menor custo de desenvolvimento vs apps nativos

#### **UX Comparável a App Nativo**
- Ícone na tela inicial
- Splash screen
- Funciona em fullscreen
- Push notifications
- Acesso a recursos do dispositivo (câmera para OCR)

---

## 6. SUPABASE - BOAS PRÁTICAS DE ARQUITETURA

### 6.1 Segurança (CRÍTICO)

#### **Row-Level Security (RLS)**
- Controla acesso a dados no nível de linha
- Sem RLS, qualquer um com anon key pode ler todos os dados
- Permite que usuários vejam apenas seus próprios dados financeiros
- **ESSENCIAL**: Cada casal deve ver apenas suas próprias finanças

#### **Políticas de Segurança**
- Manter políticas simples
- Políticas complexas com múltiplos joins prejudicam performance
- Testar políticas antes de deploy

### 6.2 Organização do Schema

#### **Schemas**
- Organizam objetos do banco (tabelas, views, functions)
- Ajudam a estruturar dados logicamente
- Evitam conflitos de nomenclatura
- Controlam acesso a diferentes partes do banco

#### **Convenções de Nomenclatura**
- Usar lowercase e underscores: `table_name`
- NUNCA usar espaços: ~~`Table Name`~~
- Consistência é fundamental

### 6.3 Relacionamentos e Modelagem

#### **Foreign Keys**
- Cria relacionamentos entre tabelas
- Base do modelo "Relacional"
- Para categorias financeiras: criar tabela separada `categories` e linkar com `expenses` via FK

#### **Normalização**
- Evitar redundância de dados
- Separar entidades em tabelas distintas
- Usar relacionamentos para conectar dados

### 6.4 Performance

#### **Indexação**
- Usar `EXPLAIN ANALYZE` para localizar gargalos
- Adicionar índices em colunas filtradas
- Cuidado com over-indexing (prejudica INSERTs/UPDATEs)

#### **Custom Functions**
- Implementar lógica de negócio no banco
- Garante consistência e precisão dos dados
- Melhor performance que processamento no cliente

### 6.5 Migrations e Versionamento

#### **Boas Práticas de Migration**
- Escrever migrations UP e DOWN
- Testar rollbacks antes de deploy
- Manter migrations pequenas e focadas
- Armazenar em controle de versão (Git)
- Aplicar em ordem em todos os ambientes

#### **Linter Integrado**
- Supabase tem linter built-in
- Aconselha sobre best practices
- Identifica problemas potenciais em queries SQL

---

## 7. DIFERENCIAIS PARA O GESTÃO PESSOAL GLX

### 7.1 Propostas de Valor Únicas

1. **Importação Automática de Faturas**
   - OCR + AI para extrair dados de PDFs
   - Categorização automática inteligente
   - Reduz trabalho manual a quase zero

2. **Análise Preditiva**
   - Machine Learning para prever gastos futuros
   - Alertas proativos de estouro de orçamento
   - Sugestões de economia baseadas em padrões

3. **Modo Casal Otimizado**
   - Despesas individuais vs compartilhadas
   - Divisão customizável (50/50, proporcional à renda, etc.)
   - Dashboard conjunto + dashboards individuais

4. **Metas de Crescimento Financeiro**
   - Objetivos de curto, médio e longo prazo
   - Visualização de progresso
   - Gamificação para engajamento

5. **PWA First**
   - Experiência de app nativo
   - Sem necessidade de lojas de apps
   - Funciona offline
   - Atualizações instantâneas

---

## 8. STACK TECNOLÓGICA RECOMENDADA

### 8.1 Frontend
- **Framework**: React ou Vue.js (para PWA)
- **UI Library**: Tailwind CSS + shadcn/ui ou Material-UI
- **PWA**: Workbox (Service Workers)
- **Charts**: Chart.js ou Recharts
- **State Management**: Zustand ou Redux Toolkit

### 8.2 Backend
- **BaaS**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **API**: Supabase Auto-generated REST API
- **Storage**: Supabase Storage (para PDFs de faturas)

### 8.3 AI/ML Processing
- **OCR**: Tesseract.js (client-side) ou Google Vision API
- **Categorização**: TensorFlow.js ou API externa (OpenAI)
- **Parsing**: PDF.js + Custom algorithms

### 8.4 DevOps
- **Hosting**: Vercel ou Netlify (otimizados para PWA)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (error tracking)

---

## 9. ROADMAP DE FUNCIONALIDADES (MVP → FULL)

### 9.1 MVP (Mínimo Produto Viável)
- [ ] Autenticação de usuários (casal)
- [ ] Cadastro manual de despesas
- [ ] Categorização manual
- [ ] Dashboard básico com totais
- [ ] Listagem de transações
- [ ] PWA instalável

### 9.2 Fase 2 - Automação
- [ ] Importação de fatura de cartão (PDF)
- [ ] OCR para extração de dados
- [ ] Categorização automática com ML
- [ ] Importação de extrato bancário
- [ ] Sincronização em tempo real

### 9.3 Fase 3 - Inteligência
- [ ] Análise preditiva de gastos
- [ ] Alertas proativos
- [ ] Sugestões de economia
- [ ] Metas financeiras com tracking
- [ ] Relatórios avançados

### 9.4 Fase 4 - Gamificação e Social
- [ ] Sistema de conquistas
- [ ] Desafios de economia
- [ ] Comparação com metas
- [ ] Celebração de objetivos alcançados

---

## 10. CONSIDERAÇÕES FINAIS

### 10.1 Fatores Críticos de Sucesso
1. **UX Simples e Rápida** - Se for complicado, vocês não vão usar
2. **Automação Máxima** - Quanto menos trabalho manual, melhor
3. **Mobile First** - A maioria dos registros será pelo celular
4. **Segurança** - Dados financeiros são sensíveis
5. **Sincronização Instantânea** - Ambos devem ver atualizações em tempo real

### 10.2 Próximos Passos Recomendados
1. **Definir arquitetura do banco de dados** (estrutura de tabelas)
2. **Criar protótipo de UI/UX** (telas principais)
3. **Implementar MVP** (funcionalidades básicas)
4. **Testar com dados reais** (suas faturas e extratos)
5. **Iterar baseado em feedback** (ajustar conforme uso)

---

## 11. HARD SKILLS NECESSÁRIAS PARA O PROJETO

### 11.1 Desenvolvimento Frontend
- React.js / Vue.js (frameworks modernos)
- PWA (Service Workers, Manifest, Cache API)
- Responsive Design (mobile-first)
- State Management (Zustand/Redux)

### 11.2 Desenvolvimento Backend
- Supabase (PostgreSQL, RLS, Auth, Storage)
- SQL avançado (queries complexas, joins, indexes)
- API REST (endpoints customizados se necessário)

### 11.3 AI/ML
- OCR (Tesseract.js ou APIs externas)
- Text Parsing (regex, pattern matching)
- Machine Learning básico (categorização)
- Natural Language Processing (extração de entidades)

### 11.4 DevOps
- Git/GitHub (versionamento)
- CI/CD (GitHub Actions)
- Deployment (Vercel/Netlify)
- Monitoring (Sentry, Analytics)

### 11.5 UX/UI Design
- Figma/Adobe XD (prototipagem)
- Design Systems (consistência visual)
- Usability Testing (testes com usuários)

---

**Data da Pesquisa**: Fevereiro de 2026
**Status**: Documento Vivo - Atualizar conforme novas descobertas
