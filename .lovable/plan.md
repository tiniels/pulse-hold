# Plano — Governança de Dados Canônica (MDM)

Objetivo: substituir campos texto livre (secretaria, cargo, vínculo, motivo, jornada, unidade) por FKs para dimensões canônicas únicas, com tabelas de alias para mapear todas as variantes históricas. Todas as 6 páginas passam a consumir as mesmas entidades.

---

## Fase 1 — Dimensões canônicas (migration única)

Novas tabelas:

```
dim_secretaria         (id, nome_oficial, sigla, ativo)
dim_secretaria_alias   (id, texto_origem_norm UNIQUE, secretaria_id, unidade_id?, confianca, fonte, revisado)
dim_unidade            (id, secretaria_id, nome_oficial)
dim_grupo_cargo        (id, nome, familia_funcional)   -- Médico, Professor, Enfermeiro...
dim_especialidade      (id, grupo_cargo_id, nome)      -- Pediatra, PEB I...
dim_cargo              (id, grupo_cargo_id, especialidade_id?, nome_oficial, nivel, jornada_id?, vinculo_id?)
dim_cargo_alias        (id, texto_origem_norm UNIQUE, cargo_id?, grupo_cargo_id, especialidade_id?, confianca, revisado)
dim_vinculo            (id, nome)                       -- Estatutário, CLT, Temporário...
dim_vinculo_alias      (id, texto_origem_norm UNIQUE, vinculo_id, revisado)
dim_jornada            (id, horas_semanais, rotulo)     -- 20h, 40h, Plantão
dim_motivo             (id, nome, categoria)            -- EXONERAÇÃO, APOSENTADORIA...
dim_submotivo          (id, motivo_id, nome)            -- a pedido, ofício
dim_motivo_alias       (id, texto_origem_norm UNIQUE, motivo_id, submotivo_id?, revisado)
dim_situacao_chamamento (id, ordem, nome)               -- Planejado→Edital→...→Encerrado
dim_situacao_alias     (id, texto_origem_norm UNIQUE, situacao_id, revisado)
```

Function `public.norm_txt(text)` — remove acentos + UPPER + colapsa espaços — usada por todos os aliases (UNIQUE key).

## Fase 2 — Semear a partir do cargos.csv + extração automática

Migration idempotente que:
1. Insere ~116 grupos_cargo do `cargos.csv`.
2. Para cada variação, insere em `dim_cargo_alias` mapeando para o grupo.
3. Extrai `SELECT DISTINCT` de cada tabela existente (admissoes, rescisoes, chamamentos, prontuarios, evolucoes_funcionais) para os campos: secretaria, cargo, vínculo, motivo — insere em `*_alias` com `confianca=0` e `revisado=false` quando não bate com CSV.
4. Regras heurísticas (SQL) para pré-classificar:
   - Secretaria: matching por palavras-chave (EDUC, SAUDE, ADMIN, OBRAS, FAZENDA, ASSIS, MEIO AMB, TRANSPORTE, GABINETE, PLANEJAMENTO…).
   - Unidade: quando o texto contém `EDUCACAO CRECHE` → Secretaria=Educação + Unidade=Creche; ACS/UBS → Saúde + Unidade=nome da UBS.
   - Vínculo: regex (ESTAT|CLT|TEMP|COMISS|EFET|CONTRAT).
   - Motivo: (EXONERA|DEMISS|APOSENT|FALEC|VACAN|RESCIS).

## Fase 3 — FKs canônicas nas tabelas existentes (não destrutivo)

`ALTER TABLE` em admissoes, rescisoes, chamamentos, prontuarios, evolucoes_funcionais:

```
+ secretaria_id      uuid REFERENCES dim_secretaria(id)
+ unidade_id         uuid REFERENCES dim_unidade(id)
+ cargo_id           uuid REFERENCES dim_cargo(id)
+ grupo_cargo_id     uuid REFERENCES dim_grupo_cargo(id)
+ especialidade_id   uuid REFERENCES dim_especialidade(id)
+ vinculo_id         uuid REFERENCES dim_vinculo(id)
+ motivo_id          uuid REFERENCES dim_motivo(id)      -- só rescisoes/chamamentos
+ situacao_id        uuid REFERENCES dim_situacao_chamamento(id)  -- só chamamentos
```

Colunas texto originais preservadas (retrocompat).

Função `public.resolve_dims()` roda como backfill (uma vez) e como trigger `BEFORE INSERT/UPDATE` — consulta `dim_*_alias` pelo `norm_txt(texto)` e preenche as FKs. Se não achar, insere alias com `revisado=false` e deixa FK nula (fica visível na tela de MDM).

Índices em todas as novas FKs.

## Fase 4 — Camada de consulta unificada (server functions)

Novo módulo `src/lib/canonical.functions.ts`:

```
listSecretarias() → dim_secretaria
listGruposCargo() → dim_grupo_cargo + count por tabela
listCargosByGrupo(grupoId)
listServidoresByCargo(cargoId)
listAliasesPendentes(tipo) → aliases com revisado=false para tela MDM
resolverAlias({tipo, aliasId, canonicoId}) → aprova mapping
```

Refactor server functions atuais (`admissoes.functions.ts`, `rescisoes.functions.ts`, `chamamentos.functions.ts`, `levantamento.functions.ts`, `evolucoes.functions.ts`, `sgc.functions.ts`) para:
- filtrar por `secretaria_id`, `grupo_cargo_id`, `especialidade_id`, `vinculo_id`, `motivo_id` (não mais por texto);
- retornar labels via JOIN com dim_*.

## Fase 5 — UI: refactor das 6 páginas

Componentes compartilhados (`src/components/canonical/`):
- `<SecretariaSelect />` — dropdown alimentado por `dim_secretaria`.
- `<GrupoCargoSelect />` / `<CargoTreeSelect />` (Grupo → Especialidade → Cargo).
- `<VinculoSelect />`, `<MotivoSelect />`.
- `<CanonicalBreadcrumb />` — Secretaria › Unidade › Grupo › Especialidade › Cargo.

Ajuste por página:
- **/** (SGC): filtros usam `dim_secretaria` + `dim_grupo_cargo`; cards de edital agrupam por grupo.
- **/admissao**: hierarquia Secretaria → Grupo → Especialidade → Servidor (não mais texto).
- **/rescisoes**: pizza de motivos vem de `dim_motivo`; agregação Grupo → Especialidade.
- **/chamamentos**: fluxo de status = `dim_situacao_chamamento` (ordem numérica); filtros por dim_*.
- **/levantamento**: agrupamento de cargos por grupo (colapsa 116 → ~40 grupos); drill Grupo → Cargo.
- **/dashboard**: KPIs consomem views canônicas (`vw_kpi_por_grupo`, `vw_kpi_por_secretaria`).

## Fase 6 — Tela de administração MDM

Nova rota `/mdm` (dentro de `_authenticated`):
- Abas: Secretarias | Unidades | Cargos | Vínculos | Motivos | Situações.
- Cada aba: lista de aliases não revisados + botão "Aprovar mapeamento" ou "Criar novo canônico".
- Ao aprovar, trigger `resolve_dims()` reaplica em todas as tabelas de origem.

---

## Riscos e mitigações

- **Volume de aliases**: com ~2.000 textos distintos, a heurística pode errar; toda tela mostra "N aliases pendentes de revisão" no topo.
- **Performance do backfill**: rodado em uma transação por tabela; índice temporário em `norm_txt(coluna)`.
- **Retrocompat**: nada é deletado; código antigo continua funcionando enquanto FKs não estão preenchidas (fallback para texto).

---

## Entregáveis por commit

1. Migration 1 — dimensões + aliases + `norm_txt` + `resolve_dims`.
2. Migration 2 — seed dos grupos_cargo a partir do CSV (117 grupos + aliases).
3. Migration 3 — ALTER TABLE + backfill + triggers.
4. `src/lib/canonical.functions.ts` + refactor das 5 functions existentes.
5. Componentes canônicos + refactor das 6 páginas.
6. Rota `/mdm` com fila de aprovação.

---

## Perguntas antes de começar

1. **Ok que aliases não resolvidos fiquem com FK NULL** (aparecem em "pendentes de revisão") ou prefere que caiam em um bucket "OUTROS / NÃO CLASSIFICADO" para nunca sumir dos dashboards?
2. **A rota `/mdm` deve ser aberta a todos os usuários autenticados** ou apenas a um papel `admin` (implico criar `user_roles` + `has_role`)?
3. **Devo entregar tudo em um único conjunto de commits** (levará bastante — 3 migrations + refactor pesado), ou prefere que eu **pause após a Fase 3** (banco pronto + backfill) para você inspecionar os aliases antes do refactor das telas?
