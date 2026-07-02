CREATE OR REPLACE FUNCTION public.norm_txt(s text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(
    upper(regexp_replace(
      translate(coalesce(s,''),
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
      '\s+', ' ', 'g')),
    ''
  );
$$;

CREATE TABLE IF NOT EXISTS public.dim_secretaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_oficial text NOT NULL UNIQUE,
  sigla text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dim_unidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria_id uuid NOT NULL REFERENCES public.dim_secretaria(id) ON DELETE CASCADE,
  nome_oficial text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (secretaria_id, nome_oficial)
);

CREATE TABLE IF NOT EXISTS public.dim_secretaria_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto_origem_norm text NOT NULL UNIQUE,
  texto_origem text NOT NULL,
  secretaria_id uuid REFERENCES public.dim_secretaria(id) ON DELETE SET NULL,
  unidade_id uuid REFERENCES public.dim_unidade(id) ON DELETE SET NULL,
  confianca int NOT NULL DEFAULT 0,
  fonte text,
  revisado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dim_grupo_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  familia_funcional text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dim_especialidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_cargo_id uuid NOT NULL REFERENCES public.dim_grupo_cargo(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_cargo_id, nome)
);

CREATE TABLE IF NOT EXISTS public.dim_jornada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horas_semanais numeric,
  rotulo text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.dim_vinculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.dim_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_cargo_id uuid NOT NULL REFERENCES public.dim_grupo_cargo(id) ON DELETE RESTRICT,
  especialidade_id uuid REFERENCES public.dim_especialidade(id) ON DELETE SET NULL,
  nome_oficial text NOT NULL UNIQUE,
  nivel text,
  jornada_id uuid REFERENCES public.dim_jornada(id) ON DELETE SET NULL,
  vinculo_id uuid REFERENCES public.dim_vinculo(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dim_cargo_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto_origem_norm text NOT NULL UNIQUE,
  cargo_id uuid REFERENCES public.dim_cargo(id) ON DELETE SET NULL,
  grupo_cargo_id uuid REFERENCES public.dim_grupo_cargo(id) ON DELETE SET NULL,
  especialidade_id uuid REFERENCES public.dim_especialidade(id) ON DELETE SET NULL,
  confianca int NOT NULL DEFAULT 0,
  revisado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dim_vinculo_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto_origem_norm text NOT NULL UNIQUE,
  vinculo_id uuid REFERENCES public.dim_vinculo(id) ON DELETE SET NULL,
  revisado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dim_motivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  categoria text
);

CREATE TABLE IF NOT EXISTS public.dim_submotivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motivo_id uuid NOT NULL REFERENCES public.dim_motivo(id) ON DELETE CASCADE,
  nome text NOT NULL,
  UNIQUE (motivo_id, nome)
);

CREATE TABLE IF NOT EXISTS public.dim_motivo_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto_origem_norm text NOT NULL UNIQUE,
  motivo_id uuid REFERENCES public.dim_motivo(id) ON DELETE SET NULL,
  submotivo_id uuid REFERENCES public.dim_submotivo(id) ON DELETE SET NULL,
  revisado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dim_situacao_chamamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem int NOT NULL,
  nome text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.dim_situacao_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto_origem_norm text NOT NULL UNIQUE,
  situacao_id uuid REFERENCES public.dim_situacao_chamamento(id) ON DELETE SET NULL,
  revisado boolean NOT NULL DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dim_secretaria, public.dim_unidade, public.dim_secretaria_alias,
  public.dim_grupo_cargo, public.dim_especialidade, public.dim_jornada, public.dim_vinculo,
  public.dim_cargo, public.dim_cargo_alias, public.dim_vinculo_alias, public.dim_motivo,
  public.dim_submotivo, public.dim_motivo_alias, public.dim_situacao_chamamento,
  public.dim_situacao_alias TO authenticated;
GRANT ALL ON public.dim_secretaria, public.dim_unidade, public.dim_secretaria_alias,
  public.dim_grupo_cargo, public.dim_especialidade, public.dim_jornada, public.dim_vinculo,
  public.dim_cargo, public.dim_cargo_alias, public.dim_vinculo_alias, public.dim_motivo,
  public.dim_submotivo, public.dim_motivo_alias, public.dim_situacao_chamamento,
  public.dim_situacao_alias TO service_role;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'dim_secretaria','dim_unidade','dim_secretaria_alias',
    'dim_grupo_cargo','dim_especialidade','dim_jornada','dim_vinculo',
    'dim_cargo','dim_cargo_alias','dim_vinculo_alias','dim_motivo',
    'dim_submotivo','dim_motivo_alias','dim_situacao_chamamento','dim_situacao_alias'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_read" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%I_read" ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_write" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%I_write" ON public.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)', t, t);
  END LOOP;
END$$;

INSERT INTO public.dim_secretaria (nome_oficial, sigla) VALUES
  ('Gabinete do Prefeito','GAB'),
  ('Secretaria Municipal de Administração','SMA'),
  ('Secretaria Municipal de Saúde','SMS'),
  ('Secretaria Municipal de Educação','SME'),
  ('Secretaria Municipal de Assistência e Desenvolvimento Social','SMADS'),
  ('Secretaria Municipal de Obras','SMO'),
  ('Secretaria Municipal de Fazenda','SMF'),
  ('Secretaria Municipal de Meio Ambiente','SMMA'),
  ('Secretaria Municipal de Cultura e Turismo','SMCT'),
  ('Secretaria Municipal de Esportes e Lazer','SMEL'),
  ('Secretaria Municipal de Transportes e Trânsito','SMTT'),
  ('Secretaria Municipal de Segurança','SMSEG'),
  ('Secretaria Municipal de Planejamento','SMP'),
  ('Secretaria Municipal de Serviços Urbanos','SMSU'),
  ('Secretaria Municipal de Habitação','SMH'),
  ('Procuradoria Geral do Município','PGM'),
  ('Controladoria Geral do Município','CGM'),
  ('Não Classificada','NC')
ON CONFLICT (nome_oficial) DO NOTHING;

INSERT INTO public.dim_vinculo (nome) VALUES
  ('Estatutário'),('CLT'),('Temporário / Processo Seletivo'),
  ('Comissionado'),('Contrato Administrativo'),('Estágio'),
  ('Terceirizado'),('Não Classificado')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.dim_motivo (nome, categoria) VALUES
  ('Exoneração','SAIDA'),('Aposentadoria','SAIDA'),('Falecimento','SAIDA'),
  ('Rescisão Contratual','SAIDA'),('Vacância','SAIDA'),('Demissão','SAIDA'),
  ('Término de Contrato','SAIDA'),('Admissão','ENTRADA'),('Nomeação','ENTRADA'),
  ('Reintegração','ENTRADA'),('Transferência','MOVIMENTACAO'),('Promoção','MOVIMENTACAO'),
  ('Reestruturação Administrativa','MOVIMENTACAO'),('Não Classificado','OUTRO')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.dim_submotivo (motivo_id, nome)
SELECT id, sub FROM public.dim_motivo m,
  LATERAL (VALUES ('A pedido'),('Ofício'),('Judicial'),('Administrativa')) v(sub)
WHERE m.nome = 'Exoneração'
ON CONFLICT DO NOTHING;

INSERT INTO public.dim_situacao_chamamento (ordem, nome) VALUES
  (10,'Planejado'),(20,'Edital Publicado'),(30,'Inscrição'),
  (40,'Classificação'),(50,'Convocação'),(60,'Documentação'),
  (70,'Perícia Médica'),(80,'Nomeação'),(90,'Posse'),
  (100,'Exercício'),(110,'Desistência'),(120,'Renúncia'),(130,'Encerrado')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.dim_jornada (horas_semanais, rotulo) VALUES
  (12,'12 horas'),(20,'20 horas'),(24,'24 horas'),(30,'30 horas'),
  (36,'36 horas'),(40,'40 horas'),(NULL,'Plantão'),(NULL,'Escala'),(NULL,'Integral')
ON CONFLICT (rotulo) DO NOTHING;

INSERT INTO public.dim_vinculo_alias (texto_origem_norm, vinculo_id, revisado)
SELECT public.norm_txt(t.k), v.id, true
FROM (VALUES
  ('ESTATUTARIO','Estatutário'),('ESTAT','Estatutário'),('EST','Estatutário'),('EFETIVO','Estatutário'),
  ('CLT','CLT'),('CELETISTA','CLT'),
  ('TEMPORARIO','Temporário / Processo Seletivo'),('TEMP','Temporário / Processo Seletivo'),
  ('PROCESSO SELETIVO','Temporário / Processo Seletivo'),('PS','Temporário / Processo Seletivo'),
  ('COMISSIONADO','Comissionado'),('COMISSAO','Comissionado'),('CC','Comissionado'),
  ('CONTRATO ADMINISTRATIVO','Contrato Administrativo'),('CONTRATO','Contrato Administrativo'),
  ('ESTAGIO','Estágio'),('ESTAGIARIO','Estágio'),
  ('TERCEIRIZADO','Terceirizado')
) t(k, vn)
JOIN public.dim_vinculo v ON v.nome = t.vn
ON CONFLICT (texto_origem_norm) DO NOTHING;

INSERT INTO public.dim_motivo_alias (texto_origem_norm, motivo_id, revisado)
SELECT public.norm_txt(t.k), m.id, true
FROM (VALUES
  ('EXONERACAO','Exoneração'),('EXONERADO','Exoneração'),('EXONERACAO A PEDIDO','Exoneração'),
  ('APOSENTADORIA','Aposentadoria'),('APOSENTADO','Aposentadoria'),
  ('FALECIMENTO','Falecimento'),('OBITO','Falecimento'),
  ('RESCISAO','Rescisão Contratual'),('RESCISAO CONTRATUAL','Rescisão Contratual'),
  ('VACANCIA','Vacância'),('DEMISSAO','Demissão'),('PEDIDO DEMISSAO','Demissão'),
  ('TERMINO CONTRATO','Término de Contrato'),('TERMINO DE CONTRATO','Término de Contrato'),
  ('ADMISSAO','Admissão'),('NOMEACAO','Nomeação'),('REINTEGRACAO','Reintegração'),
  ('TRANSFERENCIA','Transferência'),('PROMOCAO','Promoção'),
  ('REESTRUTURACAO ADMINISTRATIVA','Reestruturação Administrativa')
) t(k, mn)
JOIN public.dim_motivo m ON m.nome = t.mn
ON CONFLICT (texto_origem_norm) DO NOTHING;

INSERT INTO public.dim_situacao_alias (texto_origem_norm, situacao_id, revisado)
SELECT public.norm_txt(t.k), s.id, true
FROM (VALUES
  ('PENDENTE','Planejado'),('EM_ANDAMENTO','Convocação'),('EM ANDAMENTO','Convocação'),
  ('INICIOU','Exercício'),('AGUARDANDO_HOMOLOGACAO','Documentação'),
  ('DESISTENCIA','Desistência'),('RENUNCIA','Renúncia'),
  ('POSSE','Posse'),('EXERCICIO','Exercício'),('ENCERRADO','Encerrado'),
  ('EDITAL PUBLICADO','Edital Publicado'),('CLASSIFICACAO','Classificação'),
  ('NOMEACAO','Nomeação'),('PERICIA','Perícia Médica')
) t(k, sn)
JOIN public.dim_situacao_chamamento s ON s.nome = t.sn
ON CONFLICT (texto_origem_norm) DO NOTHING;

CREATE OR REPLACE FUNCTION public._infer_secretaria_id(txt_norm text)
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT id FROM public.dim_secretaria WHERE nome_oficial = (
    CASE
      WHEN txt_norm ~ 'EDUC' THEN 'Secretaria Municipal de Educação'
      WHEN txt_norm ~ 'SAUDE|SMS' THEN 'Secretaria Municipal de Saúde'
      WHEN txt_norm ~ 'ADMINIST|SMA\M' THEN 'Secretaria Municipal de Administração'
      WHEN txt_norm ~ 'ASSIST|SOCIAL|SMADS' THEN 'Secretaria Municipal de Assistência e Desenvolvimento Social'
      WHEN txt_norm ~ 'OBRAS' THEN 'Secretaria Municipal de Obras'
      WHEN txt_norm ~ 'FAZEND|FINANC' THEN 'Secretaria Municipal de Fazenda'
      WHEN txt_norm ~ 'MEIO AMB|AMBIENTE' THEN 'Secretaria Municipal de Meio Ambiente'
      WHEN txt_norm ~ 'CULTUR|TURISM' THEN 'Secretaria Municipal de Cultura e Turismo'
      WHEN txt_norm ~ 'ESPORT|LAZER' THEN 'Secretaria Municipal de Esportes e Lazer'
      WHEN txt_norm ~ 'TRANSPO|TRANSIT' THEN 'Secretaria Municipal de Transportes e Trânsito'
      WHEN txt_norm ~ 'SEGURAN|GUARDA' THEN 'Secretaria Municipal de Segurança'
      WHEN txt_norm ~ 'PLANEJ' THEN 'Secretaria Municipal de Planejamento'
      WHEN txt_norm ~ 'SERV.*URBAN|LIMPEZ' THEN 'Secretaria Municipal de Serviços Urbanos'
      WHEN txt_norm ~ 'HABIT' THEN 'Secretaria Municipal de Habitação'
      WHEN txt_norm ~ 'GABINETE' THEN 'Gabinete do Prefeito'
      WHEN txt_norm ~ 'PROCURA' THEN 'Procuradoria Geral do Município'
      WHEN txt_norm ~ 'CONTROLA' THEN 'Controladoria Geral do Município'
      ELSE 'Não Classificada'
    END
  );
$$;

WITH raw AS (
  SELECT DISTINCT secretaria AS t FROM public.admissoes WHERE secretaria IS NOT NULL
  UNION SELECT DISTINCT secretaria_nome FROM public.rescisoes WHERE secretaria_nome IS NOT NULL
  UNION SELECT DISTINCT secretaria FROM public.chamamentos WHERE secretaria IS NOT NULL
  UNION SELECT DISTINCT secretaria FROM public.prontuarios WHERE secretaria IS NOT NULL
  UNION SELECT DISTINCT secretaria_nome FROM public.evolucoes_funcionais WHERE secretaria_nome IS NOT NULL
)
INSERT INTO public.dim_secretaria_alias (texto_origem_norm, texto_origem, secretaria_id, confianca, fonte, revisado)
SELECT public.norm_txt(t), t, public._infer_secretaria_id(public.norm_txt(t)), 50, 'AUTO', false
FROM raw
WHERE public.norm_txt(t) IS NOT NULL
ON CONFLICT (texto_origem_norm) DO NOTHING;

WITH raw AS (
  SELECT DISTINCT cargo AS t FROM public.admissoes WHERE cargo IS NOT NULL
  UNION SELECT DISTINCT cargo_nome FROM public.rescisoes WHERE cargo_nome IS NOT NULL
  UNION SELECT DISTINCT cargo FROM public.chamamentos WHERE cargo IS NOT NULL
  UNION SELECT DISTINCT cargo FROM public.prontuarios WHERE cargo IS NOT NULL
  UNION SELECT DISTINCT cargo_atual_nome FROM public.evolucoes_funcionais WHERE cargo_atual_nome IS NOT NULL
  UNION SELECT DISTINCT evolucao_cargo_nome FROM public.evolucoes_funcionais WHERE evolucao_cargo_nome IS NOT NULL
)
INSERT INTO public.dim_cargo_alias (texto_origem_norm, grupo_cargo_id, confianca, revisado)
SELECT public.norm_txt(t), NULL::uuid, 0, false
FROM raw
WHERE public.norm_txt(t) IS NOT NULL
ON CONFLICT (texto_origem_norm) DO NOTHING;

WITH raw AS (
  SELECT DISTINCT vinculo AS t FROM public.admissoes WHERE vinculo IS NOT NULL
  UNION SELECT DISTINCT vinculo_categoria FROM public.admissoes WHERE vinculo_categoria IS NOT NULL
  UNION SELECT DISTINCT vinculo_nome FROM public.rescisoes WHERE vinculo_nome IS NOT NULL
  UNION SELECT DISTINCT vinculo_categoria FROM public.rescisoes WHERE vinculo_categoria IS NOT NULL
  UNION SELECT DISTINCT vinculo FROM public.prontuarios WHERE vinculo IS NOT NULL
  UNION SELECT DISTINCT vinculo_nome FROM public.evolucoes_funcionais WHERE vinculo_nome IS NOT NULL
)
INSERT INTO public.dim_vinculo_alias (texto_origem_norm, vinculo_id, revisado)
SELECT public.norm_txt(t), NULL::uuid, false
FROM raw
WHERE public.norm_txt(t) IS NOT NULL
ON CONFLICT (texto_origem_norm) DO NOTHING;

WITH raw AS (
  SELECT DISTINCT motivo AS t FROM public.chamamentos WHERE motivo IS NOT NULL
  UNION SELECT DISTINCT rescisao_descricao FROM public.rescisoes WHERE rescisao_descricao IS NOT NULL
  UNION SELECT DISTINCT motivo_categoria FROM public.rescisoes WHERE motivo_categoria IS NOT NULL
  UNION SELECT DISTINCT rescisao_descricao FROM public.evolucoes_funcionais WHERE rescisao_descricao IS NOT NULL
  UNION SELECT DISTINCT fundamento_categoria FROM public.evolucoes_funcionais WHERE fundamento_categoria IS NOT NULL
)
INSERT INTO public.dim_motivo_alias (texto_origem_norm, motivo_id, revisado)
SELECT public.norm_txt(t), NULL::uuid, false
FROM raw
WHERE public.norm_txt(t) IS NOT NULL
ON CONFLICT (texto_origem_norm) DO NOTHING;

INSERT INTO public.dim_situacao_alias (texto_origem_norm, situacao_id, revisado)
SELECT DISTINCT public.norm_txt(status), NULL::uuid, false
FROM public.chamamentos WHERE status IS NOT NULL
ON CONFLICT (texto_origem_norm) DO NOTHING;

ALTER TABLE public.admissoes
  ADD COLUMN IF NOT EXISTS secretaria_id uuid REFERENCES public.dim_secretaria(id),
  ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.dim_cargo(id),
  ADD COLUMN IF NOT EXISTS grupo_cargo_id uuid REFERENCES public.dim_grupo_cargo(id),
  ADD COLUMN IF NOT EXISTS especialidade_id uuid REFERENCES public.dim_especialidade(id),
  ADD COLUMN IF NOT EXISTS vinculo_id uuid REFERENCES public.dim_vinculo(id);

ALTER TABLE public.rescisoes
  ADD COLUMN IF NOT EXISTS secretaria_id uuid REFERENCES public.dim_secretaria(id),
  ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.dim_cargo(id),
  ADD COLUMN IF NOT EXISTS grupo_cargo_id uuid REFERENCES public.dim_grupo_cargo(id),
  ADD COLUMN IF NOT EXISTS especialidade_id uuid REFERENCES public.dim_especialidade(id),
  ADD COLUMN IF NOT EXISTS vinculo_id uuid REFERENCES public.dim_vinculo(id),
  ADD COLUMN IF NOT EXISTS motivo_id uuid REFERENCES public.dim_motivo(id);

ALTER TABLE public.chamamentos
  ADD COLUMN IF NOT EXISTS secretaria_id uuid REFERENCES public.dim_secretaria(id),
  ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.dim_cargo(id),
  ADD COLUMN IF NOT EXISTS grupo_cargo_id uuid REFERENCES public.dim_grupo_cargo(id),
  ADD COLUMN IF NOT EXISTS especialidade_id uuid REFERENCES public.dim_especialidade(id),
  ADD COLUMN IF NOT EXISTS motivo_id uuid REFERENCES public.dim_motivo(id),
  ADD COLUMN IF NOT EXISTS situacao_id uuid REFERENCES public.dim_situacao_chamamento(id);

ALTER TABLE public.prontuarios
  ADD COLUMN IF NOT EXISTS secretaria_id uuid REFERENCES public.dim_secretaria(id),
  ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.dim_cargo(id),
  ADD COLUMN IF NOT EXISTS grupo_cargo_id uuid REFERENCES public.dim_grupo_cargo(id),
  ADD COLUMN IF NOT EXISTS vinculo_id uuid REFERENCES public.dim_vinculo(id);

ALTER TABLE public.evolucoes_funcionais
  ADD COLUMN IF NOT EXISTS secretaria_id uuid REFERENCES public.dim_secretaria(id),
  ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.dim_cargo(id),
  ADD COLUMN IF NOT EXISTS grupo_cargo_id uuid REFERENCES public.dim_grupo_cargo(id),
  ADD COLUMN IF NOT EXISTS vinculo_id uuid REFERENCES public.dim_vinculo(id),
  ADD COLUMN IF NOT EXISTS motivo_id uuid REFERENCES public.dim_motivo(id);

CREATE INDEX IF NOT EXISTS idx_adm_sec ON public.admissoes(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_adm_gc ON public.admissoes(grupo_cargo_id);
CREATE INDEX IF NOT EXISTS idx_res_sec ON public.rescisoes(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_res_gc ON public.rescisoes(grupo_cargo_id);
CREATE INDEX IF NOT EXISTS idx_res_mot ON public.rescisoes(motivo_id);
CREATE INDEX IF NOT EXISTS idx_cha_sec ON public.chamamentos(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_cha_gc ON public.chamamentos(grupo_cargo_id);
CREATE INDEX IF NOT EXISTS idx_cha_sit ON public.chamamentos(situacao_id);
CREATE INDEX IF NOT EXISTS idx_pro_sec ON public.prontuarios(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_pro_gc ON public.prontuarios(grupo_cargo_id);
CREATE INDEX IF NOT EXISTS idx_evo_sec ON public.evolucoes_funcionais(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_evo_gc ON public.evolucoes_funcionais(grupo_cargo_id);

UPDATE public.admissoes a SET
  secretaria_id  = sa.secretaria_id,
  grupo_cargo_id = ca.grupo_cargo_id,
  cargo_id       = ca.cargo_id,
  especialidade_id = ca.especialidade_id,
  vinculo_id     = va.vinculo_id
FROM public.admissoes a2
LEFT JOIN public.dim_secretaria_alias sa ON sa.texto_origem_norm = public.norm_txt(a2.secretaria)
LEFT JOIN public.dim_cargo_alias      ca ON ca.texto_origem_norm = public.norm_txt(a2.cargo)
LEFT JOIN public.dim_vinculo_alias    va ON va.texto_origem_norm = public.norm_txt(a2.vinculo)
WHERE a.id = a2.id;

UPDATE public.rescisoes r SET
  secretaria_id  = sa.secretaria_id,
  grupo_cargo_id = ca.grupo_cargo_id,
  cargo_id       = ca.cargo_id,
  especialidade_id = ca.especialidade_id,
  vinculo_id     = va.vinculo_id,
  motivo_id      = ma.motivo_id
FROM public.rescisoes r2
LEFT JOIN public.dim_secretaria_alias sa ON sa.texto_origem_norm = public.norm_txt(r2.secretaria_nome)
LEFT JOIN public.dim_cargo_alias      ca ON ca.texto_origem_norm = public.norm_txt(r2.cargo_nome)
LEFT JOIN public.dim_vinculo_alias    va ON va.texto_origem_norm = public.norm_txt(r2.vinculo_nome)
LEFT JOIN public.dim_motivo_alias     ma ON ma.texto_origem_norm = public.norm_txt(r2.motivo_categoria)
WHERE r.id = r2.id;

UPDATE public.chamamentos c SET
  secretaria_id  = sa.secretaria_id,
  grupo_cargo_id = ca.grupo_cargo_id,
  cargo_id       = ca.cargo_id,
  especialidade_id = ca.especialidade_id,
  motivo_id      = ma.motivo_id,
  situacao_id    = si.situacao_id
FROM public.chamamentos c2
LEFT JOIN public.dim_secretaria_alias sa ON sa.texto_origem_norm = public.norm_txt(c2.secretaria)
LEFT JOIN public.dim_cargo_alias      ca ON ca.texto_origem_norm = public.norm_txt(c2.cargo)
LEFT JOIN public.dim_motivo_alias     ma ON ma.texto_origem_norm = public.norm_txt(c2.motivo)
LEFT JOIN public.dim_situacao_alias   si ON si.texto_origem_norm = public.norm_txt(c2.status)
WHERE c.id = c2.id;

UPDATE public.prontuarios p SET
  secretaria_id  = sa.secretaria_id,
  grupo_cargo_id = ca.grupo_cargo_id,
  cargo_id       = ca.cargo_id,
  vinculo_id     = va.vinculo_id
FROM public.prontuarios p2
LEFT JOIN public.dim_secretaria_alias sa ON sa.texto_origem_norm = public.norm_txt(p2.secretaria)
LEFT JOIN public.dim_cargo_alias      ca ON ca.texto_origem_norm = public.norm_txt(p2.cargo)
LEFT JOIN public.dim_vinculo_alias    va ON va.texto_origem_norm = public.norm_txt(p2.vinculo)
WHERE p.id = p2.id;

UPDATE public.evolucoes_funcionais e SET
  secretaria_id  = sa.secretaria_id,
  grupo_cargo_id = ca.grupo_cargo_id,
  cargo_id       = ca.cargo_id,
  vinculo_id     = va.vinculo_id,
  motivo_id      = ma.motivo_id
FROM public.evolucoes_funcionais e2
LEFT JOIN public.dim_secretaria_alias sa ON sa.texto_origem_norm = public.norm_txt(e2.secretaria_nome)
LEFT JOIN public.dim_cargo_alias      ca ON ca.texto_origem_norm = public.norm_txt(e2.cargo_atual_nome)
LEFT JOIN public.dim_vinculo_alias    va ON va.texto_origem_norm = public.norm_txt(e2.vinculo_nome)
LEFT JOIN public.dim_motivo_alias     ma ON ma.texto_origem_norm = public.norm_txt(e2.rescisao_descricao)
WHERE e.id = e2.id;

CREATE OR REPLACE FUNCTION public.resolve_dims_generic()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sec_txt text; car_txt text; vinc_txt text; mot_txt text; sit_txt text;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'admissoes' THEN
      sec_txt := NEW.secretaria; car_txt := NEW.cargo; vinc_txt := NEW.vinculo;
    WHEN 'rescisoes' THEN
      sec_txt := NEW.secretaria_nome; car_txt := NEW.cargo_nome; vinc_txt := NEW.vinculo_nome; mot_txt := NEW.motivo_categoria;
    WHEN 'chamamentos' THEN
      sec_txt := NEW.secretaria; car_txt := NEW.cargo; mot_txt := NEW.motivo; sit_txt := NEW.status;
    WHEN 'prontuarios' THEN
      sec_txt := NEW.secretaria; car_txt := NEW.cargo; vinc_txt := NEW.vinculo;
    WHEN 'evolucoes_funcionais' THEN
      sec_txt := NEW.secretaria_nome; car_txt := NEW.cargo_atual_nome; vinc_txt := NEW.vinculo_nome; mot_txt := NEW.rescisao_descricao;
    ELSE NULL;
  END CASE;

  IF sec_txt IS NOT NULL THEN
    INSERT INTO public.dim_secretaria_alias(texto_origem_norm, texto_origem, secretaria_id, confianca, fonte, revisado)
    VALUES (public.norm_txt(sec_txt), sec_txt, public._infer_secretaria_id(public.norm_txt(sec_txt)), 50, 'TRIGGER', false)
    ON CONFLICT (texto_origem_norm) DO NOTHING;
    NEW.secretaria_id := (SELECT secretaria_id FROM public.dim_secretaria_alias WHERE texto_origem_norm = public.norm_txt(sec_txt));
  END IF;

  IF car_txt IS NOT NULL THEN
    INSERT INTO public.dim_cargo_alias(texto_origem_norm, revisado) VALUES (public.norm_txt(car_txt), false)
    ON CONFLICT (texto_origem_norm) DO NOTHING;
    SELECT grupo_cargo_id, cargo_id, especialidade_id
      INTO NEW.grupo_cargo_id, NEW.cargo_id, NEW.especialidade_id
    FROM public.dim_cargo_alias WHERE texto_origem_norm = public.norm_txt(car_txt);
  END IF;

  IF vinc_txt IS NOT NULL AND TG_TABLE_NAME IN ('admissoes','rescisoes','prontuarios','evolucoes_funcionais') THEN
    INSERT INTO public.dim_vinculo_alias(texto_origem_norm, revisado) VALUES (public.norm_txt(vinc_txt), false)
    ON CONFLICT (texto_origem_norm) DO NOTHING;
    NEW.vinculo_id := (SELECT vinculo_id FROM public.dim_vinculo_alias WHERE texto_origem_norm = public.norm_txt(vinc_txt));
  END IF;

  IF mot_txt IS NOT NULL AND TG_TABLE_NAME IN ('rescisoes','chamamentos','evolucoes_funcionais') THEN
    INSERT INTO public.dim_motivo_alias(texto_origem_norm, revisado) VALUES (public.norm_txt(mot_txt), false)
    ON CONFLICT (texto_origem_norm) DO NOTHING;
    NEW.motivo_id := (SELECT motivo_id FROM public.dim_motivo_alias WHERE texto_origem_norm = public.norm_txt(mot_txt));
  END IF;

  IF sit_txt IS NOT NULL AND TG_TABLE_NAME = 'chamamentos' THEN
    INSERT INTO public.dim_situacao_alias(texto_origem_norm, revisado) VALUES (public.norm_txt(sit_txt), false)
    ON CONFLICT (texto_origem_norm) DO NOTHING;
    NEW.situacao_id := (SELECT situacao_id FROM public.dim_situacao_alias WHERE texto_origem_norm = public.norm_txt(sit_txt));
  END IF;

  RETURN NEW;
END$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['admissoes','rescisoes','chamamentos','prontuarios','evolucoes_funcionais']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_resolve_dims ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_resolve_dims BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.resolve_dims_generic()', t);
  END LOOP;
END$$;