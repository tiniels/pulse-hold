import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  listCargosDashboard,
  getCargoDetalhe,
  CARGO_UNKNOWN_ID,
  type CargoLinha,
} from "@/lib/cargos-dashboard.functions";
import { usePeriod } from "@/contexts/PeriodContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search, Download, ArrowUpDown, TrendingUp, TrendingDown, Circle,
  Briefcase, ChevronRight, Info, AlertTriangle, AlertOctagon, CheckCircle2,
  PauseCircle, MinusCircle, FileSpreadsheet, FileText, FileDown, Clock,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { exportCSV, exportPDF, exportXLSX, type ExportMeta } from "@/lib/admissao-export";
import { logAudit } from "@/lib/audit.functions";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, BarChart, Bar, Legend,
} from "recharts";

type SortKey = "nome" | "grupo" | "vinculo" | "entradas" | "saidas" | "saldo" | "taxa" | "ultima" | "cobertura" | "dias";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function fmtPct(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(1)}%`;
}
function fmtBRL(v: number | null): string {
  return v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function saldoTone(s: number): string {
  if (s > 0) return "text-emerald-600";
  if (s < 0) return "text-rose-600";
  return "text-muted-foreground";
}
type SemStatus = {
  label: string; className: string; hint: string;
  Icon: React.ComponentType<{ className?: string }>;
};
function semaforo(l: CargoLinha): SemStatus {
  if (!l.ativo) return { label: "Inativo", className: "bg-slate-200 text-slate-700 border border-slate-300", hint: "Cargo marcado como inativo no MDM.", Icon: PauseCircle };
  if (l.sem_movimento) return { label: "Sem mov. 12m", className: "bg-slate-100 text-slate-700 border border-slate-300", hint: "Nenhuma admissão ou desligamento nos últimos 12 meses.", Icon: MinusCircle };
  if (l.cobertura_pct != null && l.cobertura_pct < 50) return { label: "Cobertura crítica", className: "bg-rose-100 text-rose-800 border border-rose-300", hint: "Entradas no período < 50% do quadro autorizado.", Icon: AlertOctagon };
  if (l.taxa_saida_pct != null && l.taxa_saida_pct > 60) return { label: "Alta rotatividade", className: "bg-amber-100 text-amber-900 border border-amber-300", hint: "Mais de 60% das movimentações no período são saídas.", Icon: AlertTriangle };
  if (l.saldo < 0) return { label: "Déficit", className: "bg-rose-50 text-rose-800 border border-rose-200", hint: "Saídas superam entradas no período.", Icon: TrendingDown };
  if (l.saldo > 0) return { label: "Superávit", className: "bg-emerald-50 text-emerald-800 border border-emerald-200", hint: "Entradas superam saídas no período.", Icon: TrendingUp };
  return { label: "Estável", className: "bg-slate-50 text-slate-700 border border-slate-200", hint: "Movimentação equilibrada no período.", Icon: CheckCircle2 };
}

function fmtDateTimeBR(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function CargosDashboard() {
  const { fromISO, toISO } = usePeriod();
  const call = useServerFn(listCargosDashboard);
  const { data } = useSuspenseQuery(queryOptions({
    queryKey: ["cargos-dashboard", fromISO, toISO],
    queryFn: () => call({ data: { fromISO, toISO } }),
  }));

  const [q, setQ] = useState("");
  const [grupoF, setGrupoF] = useState<string>("_all");
  const [vincF, setVincF] = useState<string>("_all");
  const [nivelF, setNivelF] = useState<string>("_all");
  const [jornadaF, setJornadaF] = useState<string>("_all");
  const [statusF, setStatusF] = useState<string>("ativos"); // ativos | inativos | todos | sem_mov
  const [sortKey, setSortKey] = useState<SortKey>("saldo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openCargo, setOpenCargo] = useState<{ id: string; nome: string } | null>(null);

  const grupos = useMemo(() => {
    const s = new Set<string>();
    for (const l of data.linhas) if (l.grupo_nome) s.add(l.grupo_nome);
    return Array.from(s).sort();
  }, [data.linhas]);
  const vinculos = useMemo(() => {
    const s = new Set<string>();
    for (const l of data.linhas) if (l.vinculo_nome) s.add(l.vinculo_nome);
    return Array.from(s).sort();
  }, [data.linhas]);
  const niveis = useMemo(() => {
    const s = new Set<string>();
    for (const l of data.linhas) if (l.nivel) s.add(l.nivel);
    return Array.from(s).sort();
  }, [data.linhas]);
  const jornadas = useMemo(() => {
    const s = new Set<string>();
    for (const l of data.linhas) if (l.jornada) s.add(l.jornada);
    return Array.from(s).sort();
  }, [data.linhas]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return data.linhas.filter((l) => {
      if (statusF === "ativos" && !l.ativo) return false;
      if (statusF === "inativos" && l.ativo) return false;
      if (statusF === "sem_mov" && !l.sem_movimento) return false;
      if (grupoF !== "_all" && l.grupo_nome !== grupoF) return false;
      if (vincF !== "_all" && l.vinculo_nome !== vincF) return false;
      if (nivelF !== "_all" && l.nivel !== nivelF) return false;
      if (jornadaF !== "_all" && l.jornada !== jornadaF) return false;
      if (qn) {
        const hay = `${l.nome} ${l.grupo_nome ?? ""} ${l.vinculo_nome ?? ""}`.toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      return true;
    });
  }, [data.linhas, q, grupoF, vincF, nivelF, jornadaF, statusF]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const pick = (l: CargoLinha) => {
        switch (sortKey) {
          case "nome": return l.nome.toLowerCase();
          case "grupo": return (l.grupo_nome ?? "").toLowerCase();
          case "vinculo": return (l.vinculo_nome ?? "").toLowerCase();
          case "entradas": return l.entradas;
          case "saidas": return l.saidas;
          case "saldo": return l.saldo;
          case "taxa": return l.taxa_saida_pct ?? -1;
          case "ultima": return l.ultima_movimentacao ?? "";
          case "cobertura": return l.cobertura_pct ?? -1;
          case "dias": return l.dias_medios_casa ?? -1;
        }
      };
      const va = pick(a); const vb = pick(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalKPI = useMemo(() => {
    let e = 0, s = 0;
    for (const l of filtered) { e += l.entradas; s += l.saidas; }
    return { entradas: e, saidas: s, saldo: e - s, cargos: filtered.length };
  }, [filtered]);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "nome" || k === "grupo" || k === "vinculo" ? "asc" : "desc"); }
  };

  const ultimaAtualizacaoFontes = useMemo(() => {
    let m: string | null = null;
    for (const l of data.linhas) {
      const v = l.ultima_movimentacao;
      if (v && (!m || v > m)) m = v;
    }
    return m;
  }, [data.linhas]);

  const buildMeta = (): ExportMeta => ({
    periodo: { fromISO: fromISO ?? null, toISO: toISO ?? null },
    filtros: {
      ...(q ? { busca: q } : {}),
      ...(grupoF !== "_all" ? { grupo: grupoF } : {}),
      ...(vincF !== "_all" ? { vinculo: vincF } : {}),
      ...(nivelF !== "_all" ? { nivel: nivelF } : {}),
      ...(jornadaF !== "_all" ? { jornada: jornadaF } : {}),
      status: statusF,
    },
    extraidoEm: new Date().toISOString(),
    fonte: "dim_cargo (MDM) + admissoes + rescisoes + dim_quadro_autorizado",
    metodologia:
      "Entradas e saídas contabilizadas pelo cargo_id do MDM no período selecionado. " +
      "Saldo = entradas − saídas. Taxa de saída = saídas / (entradas + saídas). " +
      "Cobertura = entradas / quadro autorizado. Cargos sem cargo_id são apresentados no bloco 'Não classificados'.",
    observacoes: [
      ...(data.totalNaoClassificados > 0
        ? [`${data.totalNaoClassificados} movimentações sem classificação canônica (grupo/cargo) — revisar em /mdm.`]
        : []),
      ...(ultimaAtualizacaoFontes ? [] : ["Nenhuma movimentação registrada no recorte."]),
    ],
    totais: {
      cargos: totalKPI.cargos,
      entradas: totalKPI.entradas,
      saidas: totalKPI.saidas,
      saldo: totalKPI.saldo,
      naoClassificados: data.totalNaoClassificados,
    },
    ultimaAtualizacaoFontes,
  });

  const callAudit = useServerFn(logAudit);
  const runExport = async (formato: "csv" | "xlsx" | "pdf") => {
    const meta = buildMeta();
    const base = `cargos-${fromISO ?? "inicio"}-${toISO ?? "hoje"}`;
    try {
      if (formato === "csv") exportCSV(sorted, meta, `${base}.csv`);
      else if (formato === "xlsx") await exportXLSX(sorted, meta, `${base}.xlsx`);
      else await exportPDF(sorted, meta, `${base}.pdf`);
      toast.success(`Exportação ${formato.toUpperCase()} concluída`);
    } catch (e: any) {
      toast.error(`Falha ao gerar ${formato.toUpperCase()}`, { description: e?.message });
      return;
    }
    // Best-effort audit; do not block user
    void callAudit({
      data: {
        acao: `export_${formato}`,
        entidade: "admissao.cargos_dashboard",
        filtros: meta.filtros,
        detalhes: {
          periodo: meta.periodo,
          totais: meta.totais,
          linhas_exportadas: sorted.length,
        },
      },
    }).catch(() => {});
  };

  return (
    <div className="space-y-3">
      {/* KPIs agregadas */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MiniKPI label="Cargos exibidos" value={totalKPI.cargos.toLocaleString("pt-BR")} tone="text-primary" icon={<Briefcase className="h-4 w-4" />} />
        <MiniKPI label="Total admitidos" value={totalKPI.entradas.toLocaleString("pt-BR")} tone="text-emerald-600" icon={<TrendingUp className="h-4 w-4" />} />
        <MiniKPI label="Total desligados" value={totalKPI.saidas.toLocaleString("pt-BR")} tone="text-rose-600" icon={<TrendingDown className="h-4 w-4" />} />
        <MiniKPI label="Saldo do recorte" value={totalKPI.saldo.toLocaleString("pt-BR")} tone={saldoTone(totalKPI.saldo)} icon={<Circle className="h-4 w-4" />} />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cargo, grupo, vínculo…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-64 pl-7 text-xs" />
          </div>
          <SelectMini value={grupoF} onChange={setGrupoF} placeholder="Grupo" options={grupos} width="w-44" />
          <SelectMini value={vincF} onChange={setVincF} placeholder="Vínculo" options={vinculos} width="w-36" />
          <SelectMini value={nivelF} onChange={setNivelF} placeholder="Nível" options={niveis} width="w-32" />
          <SelectMini value={jornadaF} onChange={setJornadaF} placeholder="Jornada" options={jornadas} width="w-28" />
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
              <SelectItem value="sem_mov">Sem movimento 12m</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-[10px] font-normal" title="Data da movimentação mais recente considerada no recorte">
              <Clock className="h-3 w-3" aria-hidden />
              <span className="sr-only">Última atualização das fontes: </span>
              {fmtDateTimeBR(ultimaAtualizacaoFontes)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {data.totalNaoClassificados > 0 ? `${data.totalNaoClassificados} movimentações não classificadas` : "100% classificado"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Exportar grade de cargos">
                  <Download className="mr-1 h-3.5 w-3.5" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Formato do relatório
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => runExport("xlsx")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" aria-hidden />
                  Excel estruturado (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => runExport("pdf")}>
                  <FileText className="mr-2 h-4 w-4 text-rose-600" aria-hidden />
                  PDF executivo (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => runExport("csv")}>
                  <FileDown className="mr-2 h-4 w-4 text-slate-600" aria-hidden />
                  CSV bruto (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Grade cargo-first */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4" /> Grade de cargos (fonte única: dim_cargo)
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              Clique em um cargo para o detalhamento completo · Ordenação clicando na coluna
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TooltipProvider delayDuration={200}>
            <div className="max-h-[640px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <SortableTH label="Cargo" active={sortKey === "nome"} dir={sortDir} onClick={() => handleSort("nome")} />
                    <SortableTH label="Grupo" active={sortKey === "grupo"} dir={sortDir} onClick={() => handleSort("grupo")} />
                    <SortableTH label="Vínculo" active={sortKey === "vinculo"} dir={sortDir} onClick={() => handleSort("vinculo")} />
                    <TableHead className="text-xs">Status</TableHead>
                    <SortableTH label="Entradas" active={sortKey === "entradas"} dir={sortDir} onClick={() => handleSort("entradas")} className="text-right" />
                    <SortableTH label="Saídas" active={sortKey === "saidas"} dir={sortDir} onClick={() => handleSort("saidas")} className="text-right" />
                    <SortableTH label="Saldo" active={sortKey === "saldo"} dir={sortDir} onClick={() => handleSort("saldo")} className="text-right" />
                    <SortableTH label="Taxa saída" active={sortKey === "taxa"} dir={sortDir} onClick={() => handleSort("taxa")} className="text-right" />
                    <SortableTH label="Dias médios de casa" active={sortKey === "dias"} dir={sortDir} onClick={() => handleSort("dias")} className="text-right" />
                    <SortableTH label="Quadro/Cobertura" active={sortKey === "cobertura"} dir={sortDir} onClick={() => handleSort("cobertura")} className="text-right" />
                    <SortableTH label="Última mov." active={sortKey === "ultima"} dir={sortDir} onClick={() => handleSort("ultima")} />
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((l) => {
                    const sem = semaforo(l);
                    const open = () => setOpenCargo({ id: l.cargo_id, nome: l.nome });
                    return (
                      <TableRow
                        key={l.cargo_id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Abrir detalhes de ${l.nome}. Status: ${sem.label}. Entradas ${l.entradas}, saídas ${l.saidas}, saldo ${l.saldo}.`}
                        className="cursor-pointer outline-none hover:bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-primary/60"
                        onClick={open}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
                        }}
                      >
                        <TableCell className="max-w-[280px]">
                          <div className="font-medium leading-tight">{l.nome}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {l.nivel ?? "—"} · {l.jornada ?? "—"}
                            {l.salario_base != null && <> · {fmtBRL(l.salario_base)}</>}
                            {l.variantes > 1 && <> · {l.variantes} variantes de cargo</>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.grupo_nome ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.vinculo_nome ?? "—"}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${sem.className}`}>
                                <sem.Icon className="h-3 w-3" aria-hidden />
                                {sem.label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">{sem.hint}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-700">{l.entradas || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-rose-700">{l.saidas || "—"}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${saldoTone(l.saldo)}`}>{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{fmtPct(l.taxa_saida_pct)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{l.dias_medios_casa ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {l.quadro_autorizado == null
                            ? <span className="text-muted-foreground">—</span>
                            : (<><span className="text-muted-foreground">{l.entradas}/{l.quadro_autorizado}</span>{l.cobertura_pct != null && <span className="ml-1 text-[10px] text-muted-foreground">({l.cobertura_pct.toFixed(0)}%)</span>}</>)
                          }
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(l.ultima_movimentacao)}</TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    );
                  })}
                  {sorted.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="py-8 text-center text-xs text-muted-foreground">Nenhum cargo corresponde ao filtro atual.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      <CargoDetailSheet
        cargo={openCargo}
        onClose={() => setOpenCargo(null)}
      />
    </div>
  );
}

/* ================== helpers ================== */

function MiniKPI({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between text-muted-foreground">
          <p className="text-[10px] uppercase tracking-wide">{label}</p>
          <span className={tone}>{icon}</span>
        </div>
        <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function SortableTH({ label, active, dir, onClick, className }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string }) {
  return (
    <TableHead className={`cursor-pointer select-none text-xs ${className ?? ""}`} onClick={onClick}>
      <span className={`inline-flex items-center gap-1 ${active ? "text-primary" : ""}`}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
        {active && <span className="text-[9px] opacity-70">{dir === "asc" ? "▲" : "▼"}</span>}
      </span>
    </TableHead>
  );
}

function SelectMini({ value, onChange, placeholder, options, width }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[]; width: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-8 ${width} text-xs`}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-[320px]">
        <SelectItem value="_all">Todos · {placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ================== detail sheet ================== */

function CargoDetailSheet({ cargo, onClose }: { cargo: { id: string; nome: string } | null; onClose: () => void }) {
  const { fromISO, toISO } = usePeriod();
  const call = useServerFn(getCargoDetalhe);
  const enabled = !!cargo;
  const { data, isLoading } = useQuery({
    queryKey: ["cargo-detalhe", cargo?.id, fromISO, toISO],
    queryFn: () => call({ data: { cargo_id: cargo!.id, fromISO, toISO } }),
    enabled,
  });

  return (
    <TooltipProvider delayDuration={200}>
      <Sheet open={enabled} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              {cargo?.nome}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Análise cargo-first · movimentação, distribuição por secretaria, timeline e certames vinculados no MDM.
            </SheetDescription>
          </SheetHeader>

          {isLoading || !data ? (
            <div className="py-16 text-center text-xs text-muted-foreground">Carregando detalhamento…</div>
          ) : (
            <div className="mt-4 space-y-4">
            {/* Ações */}
            <div className="flex flex-wrap gap-2">
              {cargo && cargo.id !== CARGO_UNKNOWN_ID && (
                <>
                  <Link to="/levantamento" search={{ cargo_id: cargo.id }}>
                    <Button size="sm" variant="default">Analisar em /levantamento</Button>
                  </Link>
                  <Link to="/mdm">
                    <Button size="sm" variant="outline">Abrir no MDM</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Timeline mensal */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1">
                  Timeline mensal
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">Entradas e saídas por mês no período filtrado, mais saldo acumulado (linha).</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.serie_mensal} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="mes" fontSize={10} />
                    <YAxis fontSize={10} />
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="entradas" fill="hsl(142 71% 45%)" name="Entradas" />
                    <Bar dataKey="saidas" fill="hsl(0 84% 60%)" name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Por secretaria */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs">Distribuição por secretaria</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Secretaria</TableHead>
                      <TableHead className="text-right text-xs">Entradas</TableHead>
                      <TableHead className="text-right text-xs">Saídas</TableHead>
                      <TableHead className="text-right text-xs">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.por_secretaria.map((s) => (
                      <TableRow key={s.secretaria_id ?? "sem"}>
                        <TableCell className="text-xs">{s.secretaria_nome}</TableCell>
                        <TableCell className="text-right text-xs text-emerald-700">{s.entradas || "—"}</TableCell>
                        <TableCell className="text-right text-xs text-rose-700">{s.saidas || "—"}</TableCell>
                        <TableCell className={`text-right text-xs font-medium ${saldoTone(s.saldo)}`}>{s.saldo > 0 ? `+${s.saldo}` : s.saldo}</TableCell>
                      </TableRow>
                    ))}
                    {data.por_secretaria.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-4 text-center text-xs text-muted-foreground">Sem movimentação no período.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Certames vinculados */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1">
                  Certames vinculados a este cargo
                  <Badge variant="secondary" className="text-[10px]">{data.certames.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.certames.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Nenhum certame vinculado por cargo canônico ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Certame</TableHead>
                        <TableHead className="text-xs">Situação</TableHead>
                        <TableHead className="text-right text-xs">Aprovados</TableHead>
                        <TableHead className="text-right text-xs">Disponíveis</TableHead>
                        <TableHead className="text-xs">Vencimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.certames.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs">{c.tipo} {c.numero ?? ""}/{c.ano ?? ""}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.situacao ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{c.qtd_aprovados}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{c.total_disponivel}</TableCell>
                          <TableCell className="text-xs">{fmtDate(c.vencimento)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Servidores */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1">
                  Servidores movimentados no período
                  <Badge variant="secondary" className="text-[10px]">{data.servidores.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Matrícula</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.servidores.slice(0, 200).map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{s.nome}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.matricula ?? "—"}</TableCell>
                          <TableCell className="text-xs">
                            <span className={s.tipo === "admissao" ? "text-emerald-700" : "text-rose-700"}>
                              {s.tipo === "admissao" ? "Entrada" : "Saída"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{fmtDate(s.data)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.motivo_categoria ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                      {data.servidores.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="py-4 text-center text-xs text-muted-foreground">Sem movimentação no período.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {data.servidores.length > 200 && (
                    <p className="p-2 text-center text-[10px] text-muted-foreground">Mostrando 200 de {data.servidores.length}. Refine o período para ver todos.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
    </TooltipProvider>
  );
}