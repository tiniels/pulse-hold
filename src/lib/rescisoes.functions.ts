import { createServerFn } from "@tanstack/react-start";

export type Rescisao = {
  id: number;
  matricula: string | null;
  nome: string;
  secretaria_codigo: number | null;
  secretaria_nome: string;
  data_admissao: string;
  data_rescisao: string;
  rescisao_codigo: number;
  rescisao_descricao: string;
  cargo_codigo: number | null;
  cargo_nome: string;
  vinculo_nome: string;
  motivo_categoria: string;
  vinculo_categoria: string;
  dias_permanencia: number;
};

export const listRescisoes = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const pageSize = 1000;
  const all: Rescisao[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("rescisoes")
      .select("*")
      .order("data_rescisao", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Rescisao[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
});