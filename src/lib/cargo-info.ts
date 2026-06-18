import Papa from "papaparse";
import csvRaw from "@/data/salarios.csv?raw";

export type CargoInfo = {
  cargo: string;
  salarioBase: string;
  requisitos: string;
  jornada: string;
  beneficio: string;
  adicionais: string;
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
  salarioReal: string;
  nivel: string;
};

function norm(s: string | undefined | null): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

const parsed = Papa.parse<string[]>(csvRaw, {
  skipEmptyLines: true,
  newline: "\n",
});

const rows = parsed.data.slice(1); // skip header

const byKey = new Map<string, CargoInfo>();

for (const r of rows) {
  if (!r || !r[0]) continue;
  const info: CargoInfo = {
    cargo: r[0] ?? "",
    salarioBase: r[1] ?? "",
    requisitos: r[2] ?? "",
    jornada: r[3] ?? "",
    beneficio: r[4] ?? "",
    adicionais: r[5] ?? "",
    numeroConcurso: r[6] ?? "",
    homologacaoCp: r[7] ?? "",
    provaPratica: r[8] ?? "",
    qtdAprovados: r[9] ?? "",
    dataHomologacao: r[10] ?? "",
    vencimento: r[11] ?? "",
    prorrogacao: r[12] ?? "",
    totalDisponivel: r[13] ?? "",
    regularizar: r[14] ?? "",
    pedidosAbertos: r[15] ?? "",
    pedidosAndamento: r[16] ?? "",
    memo: r[17] ?? "",
    qtdAtendida: r[18] ?? "",
    desistencias: r[19] ?? "",
    salarioReal: r[20] ?? "",
    nivel: r[21] ?? "",
  };
  const full = norm(info.cargo);
  byKey.set(full, info);
  // Also index by base name (before " - ") to allow loose matching
  const base = full.split(" - ")[0];
  if (base && !byKey.has(base)) byKey.set(base, info);
}

export function getCargoInfo(cargo: string | null | undefined): CargoInfo | null {
  if (!cargo) return null;
  const key = norm(cargo);
  return byKey.get(key) ?? byKey.get(key.split(" - ")[0]) ?? null;
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