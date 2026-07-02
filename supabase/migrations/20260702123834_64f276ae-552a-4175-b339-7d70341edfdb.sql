
CREATE OR REPLACE FUNCTION public.resolve_dims_generic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  sec_txt text; car_txt text; vinc_txt text; mot_txt text; sit_txt text;
  has_esp boolean;
BEGIN
  has_esp := TG_TABLE_NAME IN ('admissoes','rescisoes','chamamentos');
  CASE TG_TABLE_NAME
    WHEN 'admissoes' THEN sec_txt := NEW.secretaria; car_txt := NEW.cargo; vinc_txt := NEW.vinculo;
    WHEN 'rescisoes' THEN sec_txt := NEW.secretaria_nome; car_txt := NEW.cargo_nome; vinc_txt := NEW.vinculo_nome; mot_txt := NEW.motivo_categoria;
    WHEN 'chamamentos' THEN sec_txt := NEW.secretaria; car_txt := NEW.cargo; mot_txt := NEW.motivo; sit_txt := NEW.status;
    WHEN 'prontuarios' THEN sec_txt := NEW.secretaria; car_txt := NEW.cargo; vinc_txt := NEW.vinculo;
    WHEN 'evolucoes_funcionais' THEN sec_txt := NEW.secretaria_nome; car_txt := NEW.cargo_atual_nome; vinc_txt := NEW.vinculo_nome; mot_txt := NEW.rescisao_descricao;
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
    IF has_esp THEN
      SELECT grupo_cargo_id, cargo_id, especialidade_id
        INTO NEW.grupo_cargo_id, NEW.cargo_id, NEW.especialidade_id
      FROM public.dim_cargo_alias WHERE texto_origem_norm = public.norm_txt(car_txt);
    ELSE
      SELECT grupo_cargo_id, cargo_id
        INTO NEW.grupo_cargo_id, NEW.cargo_id
      FROM public.dim_cargo_alias WHERE texto_origem_norm = public.norm_txt(car_txt);
    END IF;
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
END$function$;

CREATE OR REPLACE FUNCTION public._infer_grupo_cargo_id(txt_norm text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT id FROM public.dim_grupo_cargo WHERE nome = (
    CASE
      WHEN txt_norm ~ 'AUX.*DESENV.*INFANT|\mADI\M' THEN 'Auxiliar de Desenvolvimento Infantil'
      WHEN txt_norm ~ 'AUX.*ENFERM' THEN 'Auxiliar de Enfermagem'
      WHEN txt_norm ~ 'AUX.*FARM' THEN 'Auxiliar de Farmácia'
      WHEN txt_norm ~ 'AUX.*SAUDE BUCAL|ASB' THEN 'Auxiliar em Saúde Bucal'
      WHEN txt_norm ~ 'AUX.*SERV.*ALIMENT' THEN 'Auxiliar de Serviços de Alimentação'
      WHEN txt_norm ~ 'AUX.*SERV.*GER|AUX.*GERAIS|\mASG\M' THEN 'Auxiliar de Serviços Gerais'
      WHEN txt_norm ~ 'AUX.*GABINETE' THEN 'Auxiliar de Gabinete'
      WHEN txt_norm ~ 'AUX.*ADMIN' THEN 'Auxiliar Administrativo'
      WHEN txt_norm ~ 'AGENTE COMUN.*SAUDE|\mACS\M' THEN 'Agente Comunitário de Saúde'
      WHEN txt_norm ~ 'AGENTE.*ENDEMIA|\mACE\M' THEN 'Agente de Combate às Endemias'
      WHEN txt_norm ~ 'AGENTE.*DEFESA CIVIL' THEN 'Agente de Defesa Civil'
      WHEN txt_norm ~ 'AGENTE.*LIMPEZA|GARI' THEN 'Agente de Limpeza Pública'
      WHEN txt_norm ~ 'AGENTE.*ORGANIZ.*ESCOLAR|\mAOE\M' THEN 'Agente de Organização Escolar'
      WHEN txt_norm ~ 'AGENTE.*SERV.*ALIMENT' THEN 'Agente de Serviços de Alimentação'
      WHEN txt_norm ~ 'AGENTE.*SERV.*GER|AGENTE.*SERV.*PUBL' THEN 'Agente de Serviços Públicos'
      WHEN txt_norm ~ 'AGENTE.*TRANSIT' THEN 'Agente de Trânsito'
      WHEN txt_norm ~ 'AGENTE.*TRIBUT|FISCAL.*TRIBUT' THEN 'Agente Tributário'
      WHEN txt_norm ~ 'AGENTE.*ATEND' THEN 'Agente de Atendimento'
      WHEN txt_norm ~ 'AUDITOR' THEN 'Auditor Fiscal Tributário Municipal'
      WHEN txt_norm ~ 'ALUNO.*GUARDA' THEN 'Aluno da Guarda Civil Municipal'
      WHEN txt_norm ~ 'GUARDA.*(CIVIL|MUNIC)|\mGCM\M' THEN 'Guarda Civil Municipal'
      WHEN txt_norm ~ 'POLICIA MILIT' THEN 'Polícia Militar'
      WHEN txt_norm ~ 'BOMBEIRO' THEN 'Bombeiro'
      WHEN txt_norm ~ 'ARQUITET' THEN 'Arquiteto'
      WHEN txt_norm ~ 'ADVOG' THEN 'Advogado'
      WHEN txt_norm ~ 'ASSIST.*SOCIAL' THEN 'Assistente Social'
      WHEN txt_norm ~ 'ASSESSOR' THEN 'Assessor'
      WHEN txt_norm ~ 'ANALISTA' THEN 'Analista'
      WHEN txt_norm ~ 'BIBLIOT' THEN 'Bibliotecário'
      WHEN txt_norm ~ 'BIOLOG' THEN 'Biólogo'
      WHEN txt_norm ~ 'BIOMED' THEN 'Biomédico'
      WHEN txt_norm ~ 'CIRURG.*DENT|DENTIST' THEN 'Cirurgião Dentista'
      WHEN txt_norm ~ 'COMPRADOR' THEN 'Comprador'
      WHEN txt_norm ~ 'CONSELHEIRO' THEN 'Conselheiro Tutelar'
      WHEN txt_norm ~ 'CONSULTOR' THEN 'Consultor Técnico'
      WHEN txt_norm ~ 'CONTADOR' THEN 'Contador'
      WHEN txt_norm ~ 'COORDEN' THEN 'Coordenador'
      WHEN txt_norm ~ 'COVEIRO' THEN 'Coveiro'
      WHEN txt_norm ~ 'DESENH' THEN 'Desenhista Técnico'
      WHEN txt_norm ~ 'VICE.*DIRETOR' THEN 'Vice-Diretor'
      WHEN txt_norm ~ 'VICE.*PREFEITO' THEN 'Vice-Prefeito'
      WHEN txt_norm ~ 'DIRETOR' THEN 'Diretor'
      WHEN txt_norm ~ 'PREFEITO' THEN 'Prefeito'
      WHEN txt_norm ~ 'EDUCADOR.*ESPORT' THEN 'Educador Esportivo'
      WHEN txt_norm ~ 'EDUCADOR.*HIST' THEN 'Educador Histórico Cultural'
      WHEN txt_norm ~ 'ENCANADOR' THEN 'Encanador'
      WHEN txt_norm ~ 'GERENTE.*ENFERM' THEN 'Gerente de Enfermagem'
      WHEN txt_norm ~ 'SUPERVISOR.*ENFERM' THEN 'Supervisor de Enfermagem'
      WHEN txt_norm ~ 'ENFERMEIR' THEN 'Enfermeiro'
      WHEN txt_norm ~ 'ENGENHEIR' THEN 'Engenheiro'
      WHEN txt_norm ~ 'ESTAGIAR' THEN 'Estagiário'
      WHEN txt_norm ~ 'FARMAC' THEN 'Farmacêutico'
      WHEN txt_norm ~ 'FISCAL' THEN 'Fiscal'
      WHEN txt_norm ~ 'FISIOTER' THEN 'Fisioterapeuta'
      WHEN txt_norm ~ 'FONOAUD' THEN 'Fonoaudiólogo'
      WHEN txt_norm ~ 'GEOGRAF' THEN 'Geógrafo'
      WHEN txt_norm ~ 'GEOLOG' THEN 'Geólogo'
      WHEN txt_norm ~ 'INSPETOR.*ALUNO' THEN 'Inspetor de Alunos'
      WHEN txt_norm ~ 'INSTRUTOR.*ARTE' THEN 'Instrutor de Artes'
      WHEN txt_norm ~ 'INTERPRETE.*LIBRAS|LIBRAS' THEN 'Intérprete de Libras'
      WHEN txt_norm ~ 'JORNALIST' THEN 'Jornalista'
      WHEN txt_norm ~ 'CINEGRAF' THEN 'Cinegrafista'
      WHEN txt_norm ~ 'LAVADOR' THEN 'Lavador'
      WHEN txt_norm ~ 'MEDIADOR' THEN 'Mediador Presencial'
      WHEN txt_norm ~ 'MERENDEIRA' THEN 'Merendeira'
      WHEN txt_norm ~ 'MONITOR.*ASSIST' THEN 'Monitor Assistencial'
      WHEN txt_norm ~ 'MOTORISTA' THEN 'Motorista'
      WHEN txt_norm ~ 'NUTRICION' THEN 'Nutricionista'
      WHEN txt_norm ~ 'OFICIAL.*ADMIN' THEN 'Oficial Administrativo'
      WHEN txt_norm ~ 'OFICIAL.*MANUT' THEN 'Oficial de Manutenção'
      WHEN txt_norm ~ 'OFICIAL.*MARCEN|MARCENEIR' THEN 'Oficial de Marcenaria'
      WHEN txt_norm ~ 'OPERADOR.*MAQ' THEN 'Operador de Máquinas'
      WHEN txt_norm ~ 'OPERADOR.*TRAFEG' THEN 'Operador de Tráfego'
      WHEN txt_norm ~ 'ORIENTADOR.*POLO' THEN 'Orientador de Polo'
      WHEN txt_norm ~ 'PEDREIRO' THEN 'Pedreiro'
      WHEN txt_norm ~ 'PODADOR' THEN 'Podador'
      WHEN txt_norm ~ 'PROCURADOR' THEN 'Procurador'
      WHEN txt_norm ~ 'PROFESSOR|\mPEB\M|DOCENTE' THEN 'Professor'
      WHEN txt_norm ~ 'PSICOLOG' THEN 'Psicólogo'
      WHEN txt_norm ~ 'PSICOPED' THEN 'Psicopedagogo'
      WHEN txt_norm ~ 'RECEPCION' THEN 'Recepcionista'
      WHEN txt_norm ~ 'SECRETARI' THEN 'Secretário'
      WHEN txt_norm ~ 'SUPERVISOR' THEN 'Supervisor'
      WHEN txt_norm ~ 'CHEFE' THEN 'Chefe'
      WHEN txt_norm ~ 'TEC.*ADMIN' THEN 'Técnico Administrativo'
      WHEN txt_norm ~ 'TEC.*EDIFIC' THEN 'Técnico de Edificações'
      WHEN txt_norm ~ 'TEC.*ENFERM' THEN 'Técnico de Enfermagem'
      WHEN txt_norm ~ 'TEC.*FARM' THEN 'Técnico de Farmácia'
      WHEN txt_norm ~ 'TEC.*AGRIMEN' THEN 'Técnico em Agrimensura'
      WHEN txt_norm ~ 'TEC.*CONTAB' THEN 'Técnico em Contabilidade'
      WHEN txt_norm ~ 'TEC.*ELETRON' THEN 'Técnico em Eletrônica'
      WHEN txt_norm ~ 'TEC.*IMOBIL|ORTOPED' THEN 'Técnico em Imobilizações Ortopédicas'
      WHEN txt_norm ~ 'TEC.*LABORAT' THEN 'Técnico em Laboratório'
      WHEN txt_norm ~ 'TEC.*MEIO AMB' THEN 'Técnico em Meio Ambiente'
      WHEN txt_norm ~ 'TEC.*PROTESE' THEN 'Técnico em Prótese Odontológica'
      WHEN txt_norm ~ 'TEC.*SAUDE BUCAL|\mTSB\M' THEN 'Técnico em Saúde Bucal'
      WHEN txt_norm ~ 'TEC.*SEGUR.*TRAB' THEN 'Técnico em Segurança do Trabalho'
      WHEN txt_norm ~ 'TEC.*(TI|INFORM)' THEN 'Técnico em Tecnologia da Informação'
      WHEN txt_norm ~ 'TEC.*SOCIO' THEN 'Técnico Sociocultural'
      WHEN txt_norm ~ 'TEC.*TRIBUT' THEN 'Técnico Tributário'
      WHEN txt_norm ~ 'TELEFON' THEN 'Telefonista'
      WHEN txt_norm ~ 'TERAPEUT.*OCUP' THEN 'Terapeuta Ocupacional'
      WHEN txt_norm ~ 'TURISMOL' THEN 'Turismólogo'
      WHEN txt_norm ~ 'VIGIA' THEN 'Vigia Patrimonial'
      WHEN txt_norm ~ 'AJUDANTE.*ADMIN' THEN 'Ajudante Administrativo'
      WHEN txt_norm ~ 'ASSISTENTE' THEN 'Assistente'
      WHEN txt_norm ~ 'MEDIC' THEN 'Médico'
      WHEN txt_norm ~ 'BUERISTA' THEN 'Buerista'
      WHEN txt_norm ~ 'PENSAO' THEN 'Pensão Alimentícia'
      WHEN txt_norm ~ 'PRO.LABORE' THEN 'Pró-Labore'
      ELSE 'Não Informado'
    END
  );
$$;

UPDATE public.dim_cargo_alias
SET grupo_cargo_id = public._infer_grupo_cargo_id(texto_origem_norm),
    confianca = 40, revisado = false
WHERE grupo_cargo_id IS NULL;

UPDATE public.admissoes a
SET grupo_cargo_id = al.grupo_cargo_id, cargo_id = al.cargo_id, especialidade_id = al.especialidade_id
FROM public.dim_cargo_alias al
WHERE al.texto_origem_norm = public.norm_txt(a.cargo) AND a.grupo_cargo_id IS NULL;

UPDATE public.rescisoes r
SET grupo_cargo_id = al.grupo_cargo_id, cargo_id = al.cargo_id, especialidade_id = al.especialidade_id
FROM public.dim_cargo_alias al
WHERE al.texto_origem_norm = public.norm_txt(r.cargo_nome) AND r.grupo_cargo_id IS NULL;

UPDATE public.chamamentos c
SET grupo_cargo_id = al.grupo_cargo_id, cargo_id = al.cargo_id, especialidade_id = al.especialidade_id
FROM public.dim_cargo_alias al
WHERE al.texto_origem_norm = public.norm_txt(c.cargo) AND c.grupo_cargo_id IS NULL;

UPDATE public.prontuarios p
SET grupo_cargo_id = al.grupo_cargo_id, cargo_id = al.cargo_id
FROM public.dim_cargo_alias al
WHERE al.texto_origem_norm = public.norm_txt(p.cargo) AND p.grupo_cargo_id IS NULL;

UPDATE public.evolucoes_funcionais e
SET grupo_cargo_id = al.grupo_cargo_id, cargo_id = al.cargo_id
FROM public.dim_cargo_alias al
WHERE al.texto_origem_norm = public.norm_txt(e.cargo_atual_nome) AND e.grupo_cargo_id IS NULL;

REVOKE EXECUTE ON FUNCTION public._infer_grupo_cargo_id(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.vw_kpi_por_grupo AS
SELECT
  g.id AS grupo_id, g.nome AS grupo_nome,
  COALESCE(a.qtd, 0) AS admissoes, COALESCE(r.qtd, 0) AS rescisoes,
  COALESCE(c.qtd, 0) AS chamamentos, COALESCE(a.qtd, 0) - COALESCE(r.qtd, 0) AS saldo
FROM public.dim_grupo_cargo g
LEFT JOIN (SELECT grupo_cargo_id, count(*) AS qtd FROM public.admissoes WHERE grupo_cargo_id IS NOT NULL GROUP BY 1) a ON a.grupo_cargo_id = g.id
LEFT JOIN (SELECT grupo_cargo_id, count(*) AS qtd FROM public.rescisoes WHERE grupo_cargo_id IS NOT NULL GROUP BY 1) r ON r.grupo_cargo_id = g.id
LEFT JOIN (SELECT grupo_cargo_id, count(*) AS qtd FROM public.chamamentos WHERE grupo_cargo_id IS NOT NULL GROUP BY 1) c ON c.grupo_cargo_id = g.id;

CREATE OR REPLACE VIEW public.vw_kpi_por_secretaria AS
SELECT
  s.id AS secretaria_id, s.nome_oficial AS secretaria_nome,
  COALESCE(a.qtd, 0) AS admissoes, COALESCE(r.qtd, 0) AS rescisoes, COALESCE(c.qtd, 0) AS chamamentos
FROM public.dim_secretaria s
LEFT JOIN (SELECT secretaria_id, count(*) AS qtd FROM public.admissoes WHERE secretaria_id IS NOT NULL GROUP BY 1) a ON a.secretaria_id = s.id
LEFT JOIN (SELECT secretaria_id, count(*) AS qtd FROM public.rescisoes WHERE secretaria_id IS NOT NULL GROUP BY 1) r ON r.secretaria_id = s.id
LEFT JOIN (SELECT secretaria_id, count(*) AS qtd FROM public.chamamentos WHERE secretaria_id IS NOT NULL GROUP BY 1) c ON c.secretaria_id = s.id;

GRANT SELECT ON public.vw_kpi_por_grupo TO anon, authenticated;
GRANT SELECT ON public.vw_kpi_por_secretaria TO anon, authenticated;
