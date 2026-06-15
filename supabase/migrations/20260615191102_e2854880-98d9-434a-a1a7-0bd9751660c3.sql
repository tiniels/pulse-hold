ALTER TABLE public.concursos DROP CONSTRAINT IF EXISTS concursos_tipo_numero_key;
ALTER TABLE public.concursos ADD CONSTRAINT concursos_sheet_origem_key UNIQUE (sheet_origem);