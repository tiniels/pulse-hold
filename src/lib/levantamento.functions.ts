import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Certame = {
  id: string;
  tipo: "CP" | "PS";
  cargo: string;
  numero: string | null;
  ano: number | null;
  secretaria: string | null;
  orgao: string | null;
  homologacao_status: string | null;
  prova_pratica: string | null;
  qtd_aprovados: number;
  data_homologacao: string | null;
  vencimento: string | null;
  prorrogacao: string | null;
  total_disponivel: number;
  regularizar: string | null;
  pedidos_abertos: number;
  pedidos_andamento: number;
  memo: string | null;
  qtd_atendida: number;
  desistencias_renuncias: number;
  situacao: string;
  observacoes: string | null;
  arquivado: boolean;
  importacao_id: string | null;
  row_hash: string | null;
  created_at: string;
  updated_at: string;
};

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export type Importacao = {
  id: string;
  arquivo_nome: string;
  versao: number;
  status: string;
  novos: number;
  alterados: number;
  removidos: number;
  inalterados: number;
  resumo: Json | null;
  created_at: string;
};

export type Auditoria = {
  id: string;
  usuario_email: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  valores_antigos: Json | null;
  valores_novos: Json | null;
  created_at: string;
};

export type HistoricoItem = {
  id: string;
  certame_id: string | null;
  importacao_id: string | null;
  versao: number;
  snapshot: Json;
  motivo: string | null;
  created_at: string;
};

export type Simulacao = {
  id: string;
  nome: string;
  descricao: string | null;
  cenario: Json;
  resultado: Json | null;
  created_at: string;
  updated_at: string;
};

export type Vencimento = {
  id: string;
  tipo: string;
  cargo: string;
  numero: string | null;
  data_homologacao: string | null;
  vencimento_original: string | null;
  prorrogacao: string | null;
  data_alvo: string | null;
  dias_restantes: number | null;
  status: string | null;
};

export const listCertames = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const pageSize = 1000;
    const all: Certame[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await context.supabase
        .from("lev_certames")
        .select("*")
        .order("tipo")
        .order("cargo")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Certame[];
      all.push(...rows);
      if (rows.length < pageSize) break;
    }
    return all;
  });

export const listVencimentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vencimentos")
      .select("*")
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []) as Vencimento[];
  });

export const listImportacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lev_importacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Importacao[];
  });

export const listAuditoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lev_auditoria")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as Auditoria[];
  });

export const listHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { certame_id?: string } | undefined) => i ?? {})
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("lev_certames_historico")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.certame_id) q = q.eq("certame_id", data.certame_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as HistoricoItem[];
  });

export const listSimulacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lev_simulacoes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Simulacao[];
  });

export const saveSimulacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      nome: string;
      descricao?: string;
      cenario: Json;
      resultado?: Json;
    }) => i,
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("lev_simulacoes").insert({
      nome: data.nome,
      descricao: data.descricao ?? null,
      cenario: data.cenario as unknown as Json,
      resultado: (data.resultado ?? null) as unknown as Json | null,
      criado_por: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertCertame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id?: string; patch: Partial<Certame> }) => i)
  .handler(async ({ context, data }) => {
    const claims = context.claims as Record<string, unknown> | undefined;
    const email =
      typeof claims?.email === "string" ? (claims.email as string) : null;
    if (data.id) {
      const { data: old } = await context.supabase
        .from("lev_certames")
        .select("*")
        .eq("id", data.id)
        .single();
      const { error } = await context.supabase
        .from("lev_certames")
        .update(data.patch as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await context.supabase.from("lev_certames_historico").insert({
        certame_id: data.id,
        snapshot: (old ?? {}) as unknown as Json,
        motivo: "edicao_manual",
      } as never);
      await context.supabase.from("lev_auditoria").insert({
        usuario_id: context.userId,
        usuario_email: email,
        acao: "update",
        entidade: "lev_certames",
        entidade_id: data.id,
        valores_antigos: (old ?? null) as unknown as Json | null,
        valores_novos: data.patch as unknown as Json,
      } as never);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("lev_certames")
        .insert(data.patch as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await context.supabase.from("lev_auditoria").insert({
        usuario_id: context.userId,
        usuario_email: email,
        acao: "insert",
        entidade: "lev_certames",
        entidade_id: inserted?.id ?? null,
        valores_novos: data.patch as unknown as Json,
      } as never);
    }
    return { ok: true };
  });

export const arquivarCertame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; arquivado: boolean }) => i)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("lev_certames")
      .update({ arquivado: data.arquivado })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("lev_auditoria").insert({
      usuario_id: context.userId,
      acao: data.arquivado ? "arquivar" : "reativar",
      entidade: "lev_certames",
      entidade_id: data.id,
    });
    return { ok: true };
  });

/**
 * Import diff: recebe array de linhas normalizadas parseadas no cliente.
 * Compara por (tipo + cargo + numero) e retorna preview sem gravar.
 */
export const previewImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { arquivo_nome: string; rows: Array<Partial<Certame>> }) => i,
  )
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("lev_certames")
      .select("id,tipo,cargo,numero,row_hash,vencimento,total_disponivel");
    const keyOf = (r: Partial<Certame>) =>
      `${r.tipo}|${(r.cargo ?? "").trim().toLowerCase()}|${r.numero ?? ""}`;
    const map = new Map<string, any>();
    (existing ?? []).forEach((r) => map.set(keyOf(r as Partial<Certame>), r));

    const novos: Array<Partial<Certame>> = [];
    const alterados: Array<{ id: string; anterior: unknown; novo: unknown }> =
      [];
    const inalterados: Array<{ id: string }> = [];
    const chavesPlanilha = new Set<string>();

    for (const r of data.rows) {
      const k = keyOf(r);
      chavesPlanilha.add(k);
      const cur = map.get(k);
      if (!cur) novos.push(r);
      else if (cur.row_hash !== r.row_hash)
        alterados.push({ id: cur.id, anterior: cur, novo: r });
      else inalterados.push({ id: cur.id });
    }
    const removidos = (existing ?? []).filter(
      (r) => !chavesPlanilha.has(keyOf(r as Partial<Certame>)),
    );

    return {
      novos: novos as unknown as Json[],
      alterados: alterados as unknown as Json[],
      removidos: removidos as unknown as Json[],
      inalterados: inalterados as unknown as Json[],
      arquivo_nome: data.arquivo_nome,
    };
  });

export const commitImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      arquivo_nome: string;
      rows: Array<Partial<Certame>>;
      remover_ausentes: boolean;
    }) => i,
  )
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("lev_certames")
      .select("*");
    const keyOf = (r: Partial<Certame>) =>
      `${r.tipo}|${(r.cargo ?? "").trim().toLowerCase()}|${r.numero ?? ""}`;
    const map = new Map<string, Certame>();
    (existing ?? []).forEach((r) =>
      map.set(keyOf(r as unknown as Certame), r as unknown as Certame),
    );

    const { data: importacaoRow, error: iErr } = await context.supabase
      .from("lev_importacoes")
      .insert({
        arquivo_nome: data.arquivo_nome,
        versao: (existing?.length ? 2 : 1),
        status: "commit",
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (iErr) throw new Error(iErr.message);
    const importacao_id = importacaoRow!.id as string;

    let novos = 0,
      alterados = 0,
      removidos = 0,
      inalterados = 0;
    const chavesPlanilha = new Set<string>();

    for (const r of data.rows) {
      const k = keyOf(r);
      chavesPlanilha.add(k);
      const cur = map.get(k);
      const payload = { ...r, importacao_id } as never;
      if (!cur) {
        await context.supabase.from("lev_certames").insert(payload);
        novos++;
      } else if (cur.row_hash !== r.row_hash) {
        await context.supabase
          .from("lev_certames_historico")
          .insert({
            certame_id: cur.id,
            importacao_id,
            snapshot: cur as unknown as Json,
            motivo: "import_update",
          } as never);
        await context.supabase
          .from("lev_certames")
          .update(payload)
          .eq("id", cur.id);
        alterados++;
      } else {
        inalterados++;
      }
    }

    if (data.remover_ausentes) {
      for (const cur of existing ?? []) {
        if (!chavesPlanilha.has(keyOf(cur as unknown as Certame))) {
          await context.supabase.from("lev_certames_historico").insert({
            certame_id: (cur as Certame).id,
            importacao_id,
            snapshot: cur as unknown as Json,
            motivo: "import_remove",
          } as never);
          await context.supabase
            .from("lev_certames")
            .update({ arquivado: true })
            .eq("id", (cur as Certame).id);
          removidos++;
        }
      }
    }

    await context.supabase
      .from("lev_importacoes")
      .update({ novos, alterados, removidos, inalterados })
      .eq("id", importacao_id);
    await context.supabase.from("lev_auditoria").insert({
      usuario_id: context.userId,
      acao: "importar",
      entidade: "lev_importacoes",
      entidade_id: importacao_id,
      valores_novos: {
        arquivo: data.arquivo_nome,
        novos,
        alterados,
        removidos,
        inalterados,
      } as unknown as Json,
    } as never);

    return { importacao_id, novos, alterados, removidos, inalterados };
  });

export const rollbackImportacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { importacao_id: string }) => i)
  .handler(async ({ context, data }) => {
    // restore snapshots from history that belong to this import
    const { data: hist } = await context.supabase
      .from("lev_certames_historico")
      .select("*")
      .eq("importacao_id", data.importacao_id);
    for (const h of hist ?? []) {
      const snap = (h as unknown as HistoricoItem).snapshot as unknown as Partial<Certame>;
      if (h.certame_id) {
        await context.supabase
          .from("lev_certames")
          .update(snap as never)
          .eq("id", h.certame_id);
      }
    }
    await context.supabase
      .from("lev_importacoes")
      .update({ status: "rollback" })
      .eq("id", data.importacao_id);
    await context.supabase.from("lev_auditoria").insert({
      usuario_id: context.userId,
      acao: "rollback",
      entidade: "lev_importacoes",
      entidade_id: data.importacao_id,
    });
    return { ok: true, restaurados: (hist ?? []).length };
  });