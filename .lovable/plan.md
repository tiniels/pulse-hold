
# Refatoração do Painel Executivo — Base 100% Canônica (MDM)

Objetivo: eliminar qualquer uso de texto de origem em `/admissao`. Toda agregação passa a usar IDs canônicos (`secretaria_id`, `grupo_cargo_id`, `cargo_id`, `especialidade_id`, `vinculo_id`, `motivo_id`, `unidade_id`) já resolvidos pelas triggers `resolve_dims_generic`.

## 1. Camada de dados (backend)

Novo módulo `src/lib/painel-canonico.functions.ts` com server functions (todas com `requireSupabaseAuth`) que retornam DTOs planos, agregados **por ID canônico**:

- `listDimensoesCanonicas()` — devolve, em uma chamada, todas as dimensões ativas com `id` e `nome`:
  - `secretarias`: `dim_secretaria` (id, nome_oficial, sigla)
  - `unidades`: `dim_unidade` (id, nome, secretaria_id)
  - `grupos_cargo`: `dim_grupo_cargo`
  - `cargos`: `dim_cargo` (id, nome, grupo_cargo_id)
  - `especialidades`: `dim_especialidade` (id, nome, cargo_id)
  - `vinculos`, `motivos`, `situacoes`
- `listMovimentacoesCanonicas({ fromISO, toISO })` — devolve linhas magras já filtradas pelo período, unificando admissões + rescisões:
  - campos: `tipo` ("entrada" | "saida"), `data`, `secretaria_id`, `unidade_id`, `grupo_cargo_id`, `cargo_id`, `especialidade_id`, `vinculo_id`, `motivo_id`, `nome`, `matricula`, `saida_categoria` (derivada exclusivamente do `motivo_id` via `dim_motivo.categoria`).
  - `saida_categoria` vem de `dim_motivo.categoria` (Exoneração/Aposentadoria/Vacância/Rescisão/Falecimento/Outros). **Sem regex sobre texto de origem.**
- `listCoberturaMDM({ fromISO, toISO })` — devolve, para cada tipo de dimensão, contagens `{ total, classificados, pendentes, aliases_utilizados }` computadas em SQL. Também retorna listas curtas (top 10) de aliases pendentes por tipo, para o card de cobertura.
- `listAuditoriaAgregacao({ nivel, id })` — para o modal de auditoria: retorna, para uma dimensão canônica, os aliases vinculados, os textos de origem distintos presentes nas bases (`admissoes.secretaria`, `rescisoes.secretaria_nome` etc.), a contagem de registros classificados/não-classificados e o % de cobertura.

Regra de ouro: nenhuma dessas funções projeta colunas textuais das bases (`admissoes.secretaria`, `rescisoes.secretaria_nome`, `.cargo`, `.vinculo`, `.motivo_categoria`) para a UI. O texto só aparece na função de auditoria.

## 2. Camada de UI (`src/routes/admissao.tsx`)

Reescrever a página. Substituir `admissoes/rescisoes/evolucoes` puros por consumo das novas server functions via `useSuspenseQuery`.

### 2.1 Filtros superiores
- Secretaria: `<Select>` populado por `secretarias` canônicas.
- Cargo: novo `<CargoTreeSelect>` (novo componente em `src/components/painel/CargoTreeSelect.tsx`) que lista grupos canônicos expansíveis em especialidades.
- Vínculo: `dim_vinculo`.
- Motivo: `dim_motivo`.
- Nunca mostrar nomes de origem.

### 2.2 KPIs de topo
Recalculados sobre `listMovimentacoesCanonicas` filtrada. Categorias derivadas apenas do `motivo_id` → `saida_categoria`. Inclui: Entradas, Total Desligados, Saldo Líquido, Exonerações, Aposentadorias, Vacâncias, Falecimentos, Rescisões.

### 2.3 Tabela hierárquica
Novo componente `src/components/painel/HierarquiaMovimentacao.tsx` (tree grid custom com estado local de nós expandidos por chave `sec:{id} > uni:{id} > gc:{id} > esp:{id}`). Níveis:

```text
Secretaria Canônica
  └─ Unidade Canônica (por secretaria)
       └─ Grupo de Cargo Canônico
            └─ Especialidade (quando existir)
                 └─ Servidor (nome + matrícula + tipo/data do evento)
```

Cada linha exibe totais consolidados: Entradas, Saídas, Exonerações, Aposentadorias, Vacâncias, Saldo. Agregação feita em memória a partir das linhas canônicas por reduce em `Map<string, totais>` por nível. Ordenação por saldo (mais negativo no topo).

Ícone `Info` em cada linha (níveis Secretaria/Unidade/Grupo) abre `AuditoriaDialog` chamando `listAuditoriaAgregacao`.

### 2.4 Gráficos inferiores
- Evolução mensal por Secretaria Canônica: `LineChart` empilhado por `secretaria_id` (top 6 + "Outras").
- Ranking maior déficit: barras horizontais só de Secretarias Canônicas.
- Ranking maior superávit: idem.
- Comparador de períodos (`PeriodComparator`) chamando novamente as server functions para os dois períodos, comparando pelos mesmos `secretaria_id`.

### 2.5 Card lateral "Cobertura da Normalização (MDM)"
Novo componente `src/components/painel/CoberturaMDMCard.tsx`. Exibe:
- Total de registros processados
- % classificados
- Aliases utilizados
- Não classificados (link "Abrir MDM" → `<Link to="/mdm">` quando > 0)
- Secretarias / Cargos / Motivos pendentes (contagens)

### 2.6 Auditoria
`src/components/painel/AuditoriaDialog.tsx` — modal com:
- Nome canônico
- Aliases vinculados (com contagem por alias)
- Nomes de origem detectados nas bases
- % cobertura, classificados, não classificados

## 3. Reatividade automática
Todos os `queryKey` incluem `[fromISO, toISO]` e as chaves das dimensões. Uma alteração no `/mdm` (novo alias, nova dimensão) invalida via `queryClient.invalidateQueries({ queryKey: ["painel"] })` na volta para a tela, ou simplesmente reflete quando o usuário navega novamente (loader re-executa). Nenhuma string hardcoded na UI.

## 4. Arquivos

**Novos**
- `src/lib/painel-canonico.functions.ts`
- `src/components/painel/HierarquiaMovimentacao.tsx`
- `src/components/painel/CoberturaMDMCard.tsx`
- `src/components/painel/AuditoriaDialog.tsx`
- `src/components/painel/CargoTreeSelect.tsx`

**Alterados**
- `src/routes/admissao.tsx` — reescrito para consumir novas fns e usar novos componentes; remove `classSaida` textual, remove uso de `admissoes.secretaria`, `rescisoes.secretaria_nome`, etc.

**Sem alterações de schema** — o modelo canônico e as triggers já existem. Se `dim_motivo.categoria` estiver vazia para motivos existentes, faremos um `UPDATE` via migração de dados (será verificado; se necessário, incluído em um passo separado).

## 5. Validação
- Build passa (typecheck).
- Playwright: login, abre `/admissao`, verifica que filtros mostram apenas nomes canônicos, expande hierarquia até servidor, abre auditoria, verifica card de cobertura.

## Detalhes técnicos (para a equipe)

- Server fn `listMovimentacoesCanonicas` faz 2 `SELECT` paralelos em `admissoes` e `rescisoes` projetando **apenas** IDs canônicos + `nome`, `matricula`, `data`. Sem `select('*')`.
- `saida_categoria` = join com `dim_motivo.categoria`. Fallback "Outros" quando `motivo_id IS NULL`.
- Paginação mantida (1000 por página).
- `dim_unidade` hoje tem 4 colunas; verificar FK `secretaria_id`. Se ausente na tabela, o nível "Unidade" é omitido silenciosamente e a hierarquia colapsa para Secretaria → Grupo → Especialidade.
- Componente hierárquico: estado `Set<string>` de nós abertos; renderização recursiva com indentação por `depth`.
