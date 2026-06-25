
# Plano de Implementação — Mudar.md

O documento descreve uma transformação muito ampla (filtro global, comparador, drill-down universal, reformulação completa de `/admissao`, painel SOS dos editais, 15 mudanças estruturais por eixo). Vou implementar em **fases enxutas e entregáveis**, marcando o que **depende de dados que hoje não existem na base** para evitar inventar números.

---

## Fase 1 — Núcleo Temporal Global (FILTRO + COMPARADOR)

Aplica a **todas as páginas**: `/` (CP/PS), `/rescisoes`, `/admissao`.

1. **`PeriodContext`** (`src/contexts/PeriodContext.tsx`)
   - `dataInicio`, `dataFim` (default: 01/01/ano atual → hoje).
   - Persistido em `localStorage` por página.
2. **`<GlobalPeriodFilter />`** no header — dois date pickers BR (DD/MM/AAAA) + presets (Mês atual, Trimestre, YTD, 12 meses, Personalizado).
3. **`<PeriodComparator />`** no final de cada página — botão **“+ Adicionar Período”**, N períodos coloridos, gráfico de barras lado a lado dos KPIs principais da página, normalização automática (total / média diária / variação %).
4. **Refator dos hooks de dados**: cada `useQuery` passa a aceitar `{ dataInicio, dataFim }` e filtra server-side (server functions já existentes ganham `inputValidator` com o range).

## Fase 2 — Drill-down universal em gráficos

Wrapper `<DrillableChart>` que envolve pizza/donut/barra/coluna do Recharts e:
- intercepta `onClick` da fatia/coluna,
- abre um `<RegistrosDialog>` listando os servidores/registros da agregação,
- reusa a tabela compacta já existente em `ServidoresListDialog`.

Aplicado a todos os gráficos de `/rescisoes` e `/admissao`.

## Fase 3 — Reformulação de `/admissao` (linguagem formal + arquitetura em camadas)

- **Cabeçalho**: “Painel de Monitoramento de Movimentação e Sucessão de Pessoal — DP-CAB | N registros | Período: …”.
- **Renomeação completa** dos KPIs, abas, cards de alerta, colunas e badges conforme tabelas do .md (Variação Líquida, Taxa de Reposição, Aproveitamento de Servidores Internos, Desligamento Precoce, Reingresso, etc.).
- **Camadas de decisão** (Shneiderman):
  - Camada 1 — KPIs sempre visíveis.
  - Camada 2 — abas (Estabilidade, Atrito, Talentos, Eficiência, Risco).
  - Camada 3 — tabelas colapsadas sob “Expandir detalhamento”.
- **Balanço Patrimonial de Pessoal**: substitui o card Saldo Líquido por componente com Entradas × Saídas e sparkline 12 meses (usa `admissoes` + `rescisoes`).
- **Funil de Admissões**: usando os estágios que conseguimos derivar (Admitidos → Em estágio probatório → Estáveis), com gargalos.
- **Curva de Retenção (Kaplan-Meier simplificado)**: dias entre posse e exoneração da coorte do período.
- **Reingresso contextualizado**: classifica os 173 por modalidade derivável dos dados (Novo concurso vs. Mesma matrícula recorrente).
- **Painel de Eficiência por Secretaria**: tabela ranking (Admissões, Vacância, Retenção, Score).

## Fase 4 — Melhorias do painel CP/PS (`/`)

- **3 Views/Abas**: `SOS (≤30 dias) | Planejamento (30–180) | Auditoria`.
- **Semáforo de Validade** nos cards de edital (🔴 🟡 🟢 ⚪).
- **Cards de Alerta horizontais** substituindo a tabela longa na view SOS.
- **Timeline Gantt** dos vencimentos nos próximos 12 meses.
- **KPI “Risco de Apagão”** = vagas em aberto ÷ candidatos disponíveis (por secretaria).
- **Funil de Conversão do Certame**: Vagas → Inscritos → Aprovados → Nomeados → Efetivados (até onde os dados permitirem; etapas ausentes ficam vazias com aviso).
- **Mapa de calor Secretaria × Status** e **Ranking Top 5 críticas**.

## Fase 5 — Itens que precisam de dado novo (fica como TODO/placeholder honesto)

Vou criar os componentes com **estado “Dados não disponíveis — requer importação de …”** em vez de inventar números:

- **Índice de Envelhecimento / Aposentadoria** → precisa `data_nascimento` dos servidores.
- **Motivos declarados de exoneração** (remuneração, clima…) → precisa coluna `motivo` semântica.
- **Satisfação 90 dias / Programa de integração** → precisa pesquisa interna.
- **Custos (R$ 4.200, R$ 2.1M, R$ 8.7M)** → precisa parâmetros de RH.
- **Plano de Sucessão por cargo** → precisa cadastro de sucessores.
- **Perícia médica / Lotação como etapas do funil** → precisa workflow do RH.

---

## Detalhes técnicos

- Stack atual já tem TanStack Start + Query + Recharts + shadcn — toda a Fase 1–4 cabe sem novas dependências (exceto `date-fns` se ainda não estiver, e talvez `react-day-picker` que já vem com shadcn).
- Filtragem por período é feita nas server functions (`.gte('data', inicio).lte('data', fim)`) — sem quebrar RLS atual.
- Comparador faz N queries paralelas via `useQueries`, sem mudança de schema.
- Drill-down não precisa de schema novo: reaproveita as listas já carregadas.
- Nenhuma migration nova é necessária para Fases 1–4.

---

## O que peço para confirmar antes de começar

1. **Posso seguir nessa ordem (1→4)**, deixando a Fase 5 marcada como “requer dados adicionais”?
2. **Quer que eu entregue tudo de uma vez** (commit grande) **ou fase por fase** (cada fase em uma rodada para você validar visualmente)?
3. Os **valores monetários e metas** citados no .md (R$ 4.200/integração, meta 85% retenção, etc.) são **fixos institucionais** ou devem ser configuráveis numa tela de parâmetros?

Confirmando isso eu começo já pela Fase 1.
