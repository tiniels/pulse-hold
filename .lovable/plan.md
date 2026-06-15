## Escopo

Construir o "Sistema de Convocação de Candidatos" sobre o DP-CAB já existente, importando automaticamente os Excels `CONCURSOS.xlsx` (20 abas CP) e `SELETIVOS.xlsx` (21 abas PS/PSS), e desabilitar o badge "Edit with Lovable".

## 1. Banco de Dados (migration)

Novas tabelas (todas com RLS pública para leitura, escrita só autenticado, mesmo padrão das existentes):

- `concursos` — id, tipo (`CP`|`PS`), numero (`01/2020`), nome, data_realizacao, data_homologacao, data_vencimento, prorrogado_ate, sheet_origem
- `cargos_fila` — id, concurso_id, codigo (ex `123`), nome_original, nome_normalizado, secao (`ESPECIAL`|`FINAL`)
- `candidatos` — id, cargo_fila_id, inscricao, nome, documento, nota, classificacao, lista_tipo (`GERAL`|`PCD`|`MSVD`), data_convocacao, status (`DISPONIVEL`|`CONVOCADO`|`DESISTENTE`|`SEM_EFEITO`), observacao, ordem_linha
- `convocacoes_log` — id, candidato_id, acao, usuario, criado_em (auditoria)

Índices por (cargo_normalizado), (concurso.data_realizacao), (status).

## 2. Parser Python (state machine)

Script `scripts/import_excel.py` rodado localmente para gerar um SQL seed.

Estados: `IDENTIFICANDO_CONCURSO → CABEÇALHO_DATAS → IDENTIFICANDO_SECAO (ESPECIAL/FINAL) → IDENTIFICANDO_CARGO → LER_CANDIDATOS`.

Regras de detecção:
- Linha começa com "CONCURSO PÚBLICO"/"PROCESSO SELETIVO" → novo concurso.
- Linha "Real: dd/mm/aaaa Hom: dd/mm/aaaa" → datas (regex).
- "CARGOS PRORROGADOS DE dd/mm/aaaa" → prorrogado_ate.
- "CLASSIFICAÇÃO ESPECIAL..." → secao=ESPECIAL; "CLASSIFICAÇÃO FINAL" → secao=FINAL.
- "CARGO NNN - NOME" → novo cargo (codigo + nome).
- "CONVOCAR PCD" / "CONVOCAR MSVD" → marca próximas linhas como PCD/MSVD até a próxima linha de marcador ou fim de cargo.
- Linhas de header "INSCRIÇÃO | NOME ..." → ignora.
- Linhas com inscrição numérica → candidato.

Normalização do nome: remove `"CARGO N -"`, trim, upper, sem acento.

Tratamento de observações:
- "SEM EFEITO" / "RETORNA PARA LISTA GERAL" → lista_tipo=GERAL, status=DISPONIVEL.
- "JÁ CONVOCADO" + data → status=CONVOCADO.
- Nome contém "(PCD)" → força lista_tipo=PCD.
- data_convocacao preenchida e válida → status=CONVOCADO; vazia → DISPONIVEL.
- Erros (#VALUE!) → ignora data, mantém DISPONIVEL com observação.

Saída: `supabase/migrations/<ts>_seed_concursos.sql` com INSERTs em lote. Importação roda via migration tool (uma só) com TRUNCATE+INSERT para idempotência.

## 3. Server Functions (TanStack)

`src/lib/convocacao.functions.ts`:
- `listarCargosAgrupados()` — devolve cargos únicos com agregados (total disponível, total convocado, concursos ativos).
- `obterFila({ cargoNormalizado, lista? })` — JOIN candidatos+cargos_fila+concursos, filtra `status='DISPONIVEL'`, ordena por `concursos.data_realizacao ASC, lista_tipo (GERAL,PCD,MSVD), classificacao ASC`. Marca de qual concurso vem.
- `convocarCandidato({ candidatoId })` (auth) — UPDATE status=CONVOCADO, INSERT log.
- `estatisticasCargo({ cargoNormalizado })`.

## 4. UI

- Tabela CP/PS existente: clique no nome do cargo abre `Dialog` "Fila de Convocação".
- Dialog mostra Tabs `Geral | PcD | MSVD`, cards com posição, nome, nota, classificação, badge "Vindo do CP 03/2022", botão **Convocar**.
- Após convocar: invalida query, próximo aparece automaticamente.
- Sem nova rota admin (importação roda por migration).

## 5. Badge Lovable

Desabilitar via `publish_settings--set_badge_visibility`.

## Detalhes técnicos

- Parser roda no sandbox; gera SQL com `gen_random_uuid()` e usa CTE para mapear FKs por número de concurso + código de cargo.
- Migration única ~3-5 MB de INSERTs (≈ 40 sheets × ~100 candidatos). Se ficar grande demais, divido em 2 migrations (CP e PS).
- Server functions usam `requireSupabaseAuth` apenas para mutações; leitura é pública via `supabaseAdmin` dentro do handler.
- Não toco em `src/integrations/supabase/*` auto-gerados.

## Fora de escopo

- Painel `/admin/importar-excel` com upload (mencionado como opcional) — fica para próxima iteração.
- Swagger/Postman — APIs ficam documentadas no código.
- Deploy/migrations rodam automaticamente pelo Lovable Cloud.

Confirma que posso seguir?
