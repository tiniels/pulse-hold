import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listCargos, type CargoCanonico } from "@/lib/canonical.functions";

/**
 * CargoInfo — visão consolidada de dados de um cargo, projetada a partir
 * do dim_cargo (fonte única). Substitui o antigo parser de salarios.csv.
 */
export type CargoInfo = {
  cargo: string;
  vinculo: string;
  salarioBase: string;
  salarioReal: string;
  jornada: string;
  nivel: string;
  requisitos: string;
  beneficio: string;
  adicionais: string;
  // Campos legados (mantidos vazios para compatibilidade com telas antigas).
  numeroConcurso: string;
  homologacaoCp: string;
  provaPratica: string;
  qtdAprovados: string;
  dataHomologacao: string;
  vencimento: string;
  prorrogacao: string;
  totalDisponivel: string;
  regularizar: string;
  pedidosAbertos: string;
  pedidosAndamento: string;
  memo: string;
  qtdAtendida: string;
  desistencias: string;
};

function norm(s: string | undefined | null): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cargoToInfo(c: CargoCanonico): CargoInfo {
  const brl = (v: number | null) =>
    v == null ? "" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  return {
    cargo: c.nome,
    vinculo: c.vinculo_nome ?? "",
    salarioBase: brl(c.salario_base),
    salarioReal: brl(c.salario_real_esperado),
    jornada: c.jornada ?? "",
    nivel: c.nivel ?? "",
    requisitos: c.requisitos.join(" • "),
    beneficio: c.beneficios.join(" • "),
    adicionais: c.adicionais.join(" • "),
    numeroConcurso: "",
    homologacaoCp: "",
    provaPratica: "",
    qtdAprovados: "",
    dataHomologacao: "",
    vencimento: "",
    prorrogacao: "",
    totalDisponivel: "",
    regularizar: "",
    pedidosAbertos: "",
    pedidosAndamento: "",
    memo: "",
    qtdAtendida: "",
    desistencias: "",
  };
}

export type CargoLookup = {
  list: CargoCanonico[];
  get: (cargo: string | null | undefined, vinculo?: string | null) => CargoInfo | null;
};

const cargosLookupQO = queryOptions({
  queryKey: ["cargos", "lookup"] as const,
  queryFn: async (): Promise<CargoCanonico[]> => (await listCargos()) as CargoCanonico[],
  staleTime: 60_000,
});

export function useCargoLookup(): CargoLookup {
  const { data } = useSuspenseQuery(cargosLookupQO);
  const list = data as CargoCanonico[];
  const byNameVinc = new Map<string, CargoCanonico>();
  const byName = new Map<string, CargoCanonico>();
  for (const c of list) {
    const n = norm(c.nome);
    byNameVinc.set(`${n}|${norm(c.vinculo_nome)}`, c);
    if (!byName.has(n)) byName.set(n, c);
    // also index base (before " - ")
    const base = n.split(" - ")[0];
    if (base && !byName.has(base)) byName.set(base, c);
  }
  return {
    list,
    get: (cargo, vinculo) => {
      if (!cargo) return null;
      const k = norm(cargo);
      const kv = `${k}|${norm(vinculo)}`;
      const hit = (vinculo && byNameVinc.get(kv)) || byName.get(k) || byName.get(k.split(" - ")[0]);
      return hit ? cargoToInfo(hit) : null;
    },
  };
}

export function formatBRL(value: string | null | undefined): string {
  if (!value) return "—";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return "—";
  // Try parsing if already formatted ("R$ 7.497,97") leave as-is
  if (/R\$/.test(trimmed)) return trimmed;
  const num = Number(trimmed.replace(/\./g, "").replace(",", "."));
  if (Number.isFinite(num)) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  }
  return trimmed;
}

export function nivelTone(nivel: string | null | undefined): string {
  const n = norm(nivel);
  if (n.startsWith("SUPERIOR")) return "bg-primary/10 text-primary border-primary/30";
  if (n.startsWith("MEDIO")) return "bg-warning/15 text-warning-foreground border-warning/30";
  if (n.startsWith("FUNDAMENTAL")) return "bg-muted text-muted-foreground border-border";
  return "bg-muted text-muted-foreground border-border";
}

export function displayOrFallback(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  if (!t || t === "-" || /^N[ãa]o Temos$/i.test(t)) return "Não informado";
  return t;
}