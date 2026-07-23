import type { CargoLinha } from "@/lib/cargos-dashboard.functions";

export type ExportMeta = {
  periodo: { fromISO: string | null; toISO: string | null };
  filtros: Record<string, string>;
  extraidoEm: string; // ISO
  fonte: string;
  metodologia: string;
  observacoes: string[];
  totais: {
    cargos: number;
    entradas: number;
    saidas: number;
    saldo: number;
    naoClassificados: number;
  };
  ultimaAtualizacaoFontes: string | null;
};

function fmtDateISO(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const HEADERS = [
  { key: "nome", header: "Cargo", width: 40 },
  { key: "grupo_nome", header: "Grupo", width: 28 },
  { key: "vinculo_nome", header: "Vínculo", width: 18 },
  { key: "nivel", header: "Nível", width: 12 },
  { key: "jornada", header: "Jornada", width: 12 },
  { key: "ativo", header: "Ativo", width: 8 },
  { key: "entradas", header: "Entradas", width: 10 },
  { key: "saidas", header: "Saídas", width: 10 },
  { key: "saldo", header: "Saldo", width: 10 },
  { key: "taxa_saida_pct", header: "Taxa saída %", width: 12 },
  { key: "dias_medios_casa", header: "Dias médios de casa", width: 18 },
  { key: "quadro_autorizado", header: "Quadro autorizado", width: 16 },
  { key: "cobertura_pct", header: "Cobertura %", width: 12 },
  { key: "ultima_admissao", header: "Última admissão", width: 14 },
  { key: "ultima_rescisao", header: "Última rescisão", width: 14 },
  { key: "salario_base", header: "Salário base (R$)", width: 16 },
] as const;

function rowFrom(l: CargoLinha) {
  return {
    nome: l.nome,
    grupo_nome: l.grupo_nome ?? "",
    vinculo_nome: l.vinculo_nome ?? "",
    nivel: l.nivel ?? "",
    jornada: l.jornada ?? "",
    ativo: l.ativo ? "Sim" : "Não",
    entradas: l.entradas,
    saidas: l.saidas,
    saldo: l.saldo,
    taxa_saida_pct: l.taxa_saida_pct == null ? "" : Number(l.taxa_saida_pct.toFixed(1)),
    dias_medios_casa: l.dias_medios_casa ?? "",
    quadro_autorizado: l.quadro_autorizado ?? "",
    cobertura_pct: l.cobertura_pct == null ? "" : Number(l.cobertura_pct.toFixed(1)),
    ultima_admissao: fmtDateISO(l.ultima_admissao),
    ultima_rescisao: fmtDateISO(l.ultima_rescisao),
    salario_base: l.salario_base ?? "",
  };
}

/* ---------- CSV ---------- */

export function exportCSV(rows: CargoLinha[], meta: ExportMeta, filename: string) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  lines.push(`# Painel Executivo — Grade de Cargos`);
  lines.push(`# Extraído em: ${fmtDateTime(meta.extraidoEm)}`);
  lines.push(`# Período: ${fmtDateISO(meta.periodo.fromISO)} a ${fmtDateISO(meta.periodo.toISO)}`);
  lines.push(`# Filtros: ${Object.entries(meta.filtros).map(([k, v]) => `${k}=${v}`).join(" | ") || "nenhum"}`);
  lines.push(`# Fonte: ${meta.fonte}`);
  lines.push(`# Metodologia: ${meta.metodologia}`);
  lines.push(`# Última atualização das fontes: ${fmtDateISO(meta.ultimaAtualizacaoFontes)}`);
  lines.push(
    `# Totais: cargos=${meta.totais.cargos}; entradas=${meta.totais.entradas}; saidas=${meta.totais.saidas}; saldo=${meta.totais.saldo}; naoClassificados=${meta.totais.naoClassificados}`,
  );
  if (meta.observacoes.length) lines.push(`# Observações: ${meta.observacoes.join(" | ")}`);
  lines.push(HEADERS.map((h) => h.header).join(";"));
  for (const l of rows) {
    const r = rowFrom(l);
    lines.push(HEADERS.map((h) => esc((r as any)[h.key])).join(";"));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

/* ---------- XLSX ---------- */

export async function exportXLSX(rows: CargoLinha[], meta: ExportMeta, filename: string) {
  const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
  const wb = new (ExcelJS as any).Workbook();
  wb.creator = "DP - CAB";
  wb.created = new Date();

  // Sumário
  const s = wb.addWorksheet("Sumário");
  s.columns = [{ width: 32 }, { width: 90 }];
  const rowsMeta: [string, string][] = [
    ["Relatório", "Painel Executivo — Grade de Cargos"],
    ["Extraído em", fmtDateTime(meta.extraidoEm)],
    ["Período", `${fmtDateISO(meta.periodo.fromISO)} a ${fmtDateISO(meta.periodo.toISO)}`],
    ["Filtros aplicados", Object.entries(meta.filtros).map(([k, v]) => `${k}: ${v}`).join("  ·  ") || "nenhum"],
    ["Fonte de dados", meta.fonte],
    ["Metodologia", meta.metodologia],
    ["Última atualização das fontes", fmtDateISO(meta.ultimaAtualizacaoFontes)],
    ["Total de cargos", String(meta.totais.cargos)],
    ["Total de admissões", String(meta.totais.entradas)],
    ["Total de desligamentos", String(meta.totais.saidas)],
    ["Saldo", String(meta.totais.saldo)],
    ["Movimentações não classificadas", String(meta.totais.naoClassificados)],
    ["Observações", meta.observacoes.join("\n") || "—"],
  ];
  for (const [k, v] of rowsMeta) {
    const r = s.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }
  s.getRow(1).font = { bold: true, size: 14 };

  // Dados
  const d = wb.addWorksheet("Cargos");
  d.columns = HEADERS.map((h) => ({ header: h.header, key: h.key, width: h.width }));
  d.getRow(1).font = { bold: true };
  d.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } };
  d.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEADERS.length } };
  for (const l of rows) d.addRow(rowFrom(l));
  d.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

/* ---------- PDF ---------- */

export async function exportPDF(rows: CargoLinha[], meta: ExportMeta, filename: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Painel Executivo — Grade de Cargos", 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const lines = [
    `Extraído em: ${fmtDateTime(meta.extraidoEm)}`,
    `Período: ${fmtDateISO(meta.periodo.fromISO)} a ${fmtDateISO(meta.periodo.toISO)}`,
    `Filtros: ${Object.entries(meta.filtros).map(([k, v]) => `${k}=${v}`).join(" | ") || "nenhum"}`,
    `Fonte: ${meta.fonte}`,
    `Metodologia: ${meta.metodologia}`,
    `Última atualização das fontes: ${fmtDateISO(meta.ultimaAtualizacaoFontes)}`,
    `Totais: cargos=${meta.totais.cargos} · entradas=${meta.totais.entradas} · saídas=${meta.totais.saidas} · saldo=${meta.totais.saldo} · não classificados=${meta.totais.naoClassificados}`,
  ];
  let y = 58;
  for (const l of lines) { doc.text(l, 40, y); y += 12; }
  if (meta.observacoes.length) {
    doc.setFont("helvetica", "bold"); doc.text("Observações:", 40, y); y += 12;
    doc.setFont("helvetica", "normal");
    for (const o of meta.observacoes) { doc.text(`• ${o}`, 50, y); y += 12; }
  }

  const head = [HEADERS.map((h) => h.header)];
  const body = rows.map((l) => {
    const r = rowFrom(l);
    return HEADERS.map((h) => String((r as any)[h.key] ?? ""));
  });

  autoTable(doc, {
    startY: y + 8,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 90 } },
    didDrawPage: (data) => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `DP - CAB · Relatório gerencial · Página ${data.pageNumber} de ${page}`,
        40,
        doc.internal.pageSize.getHeight() - 20,
      );
      doc.text(fmtDateTime(meta.extraidoEm), W - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
    },
  });

  doc.save(filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}