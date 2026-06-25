
-- Drop all permissive public read policies
DROP POLICY IF EXISTS "Public read admissoes" ON public.admissoes;
DROP POLICY IF EXISTS "Public read candidatos" ON public.candidatos;
DROP POLICY IF EXISTS "Public read cargos_fila" ON public.cargos_fila;
DROP POLICY IF EXISTS "Public read CP" ON public.concurso_publico;
DROP POLICY IF EXISTS "Public read concursos" ON public.concursos;
DROP POLICY IF EXISTS "Public read log" ON public.convocacoes_log;
DROP POLICY IF EXISTS "Public read evolucoes" ON public.evolucoes_funcionais;
DROP POLICY IF EXISTS "Public read PS" ON public.processo_seletivo;
DROP POLICY IF EXISTS "Leitura pública de rescisões" ON public.rescisoes;
DROP POLICY IF EXISTS "Public read venc" ON public.vencimentos;

-- Replace permissive ALL policies (using=true/with_check=true) with auth-scoped ones
DROP POLICY IF EXISTS "Auth write candidatos" ON public.candidatos;
DROP POLICY IF EXISTS "Auth write cargos_fila" ON public.cargos_fila;
DROP POLICY IF EXISTS "Auth write CP" ON public.concurso_publico;
DROP POLICY IF EXISTS "Auth write concursos" ON public.concursos;
DROP POLICY IF EXISTS "Auth write log" ON public.convocacoes_log;
DROP POLICY IF EXISTS "Auth write PS" ON public.processo_seletivo;
DROP POLICY IF EXISTS "Autenticados podem gerenciar rescisões" ON public.rescisoes;
DROP POLICY IF EXISTS "Auth write venc" ON public.vencimentos;

-- Authenticated-only SELECT policies
CREATE POLICY "Authenticated read admissoes" ON public.admissoes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read candidatos" ON public.candidatos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read cargos_fila" ON public.cargos_fila FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read CP" ON public.concurso_publico FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read concursos" ON public.concursos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read log" ON public.convocacoes_log FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read evolucoes" ON public.evolucoes_funcionais FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read PS" ON public.processo_seletivo FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read rescisoes" ON public.rescisoes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read venc" ON public.vencimentos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Authenticated write policies (scoped to signed-in users, not literal true)
CREATE POLICY "Authenticated write candidatos" ON public.candidatos FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write cargos_fila" ON public.cargos_fila FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write CP" ON public.concurso_publico FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write concursos" ON public.concursos FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write log" ON public.convocacoes_log FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write PS" ON public.processo_seletivo FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write rescisoes" ON public.rescisoes FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write venc" ON public.vencimentos FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write admissoes" ON public.admissoes FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write evolucoes" ON public.evolucoes_funcionais FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
