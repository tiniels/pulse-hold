import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listRescisoes, type Rescisao } from "@/lib/rescisoes.functions";
import { listEvolucoes } from "@/lib/evolucoes.functions";
import { buildAggregated, type Aggregated } from "@/lib/rescisao-aggregate";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import { JornadaTimeline } from "@/components/rescisoes/JornadaTimeline";
import { EvolucaoAnalysis } from "@/components/rescisoes/EvolucaoAnalysis";
import { ServidoresListDialog } from "@/components/rescisoes/ServidoresListDialog";
import { GlobalPeriodFilter } from "@/components/period/GlobalPeriodFilter";
import { PeriodComparator, type MetricResult } from "@/components/period/PeriodComparator";
import { usePeriod } from "@/contexts/PeriodContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiSelect } from "@/components/rescisoes/MultiSelect";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, AreaChart, Area,
} from "recharts";
import {
  CalendarIcon, TrendingDown, TrendingUp, Building2,
  ArrowUpDown, ArrowLeft, X, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInMonths, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const VINCULOS = [
  "Estatutário",
  "Celetista/Temporário",
  "Comissionado",
  "Pensionista",
  "Estagiário",
  "Eletivo",
] as const;

const MOTIVO_COLORS: Record<string, string> = {
  "Pedido de Demissão": "hsl(217 91% 60%)",
  "Aposentadoria": "hsl(142 71% 45%)",
  "Falecimento": "hsl(0 0% 45%)",
  "Fim de Contrato": "hsl(38 92% 50%)",
  "Justa Causa": "hsl(0 84% 60%)",
  "Sem Justa Causa": "hsl(280 65% 60%)",
  "Outros": "hsl(210 10% 60%)",
};
const MOTIVOS_ORDER = Object.keys(MOTIVO_COLORS);

const rescisoesQuery = queryOptions({
  queryKey: ["rescisoes", "all"],
  queryFn: () => listRescisoes(),
});
const evolucoesQuery = queryOptions({
  queryKey: ["evolucoes", "all"],
  queryFn: () => listEvolucoes(),
});

export const Route = createFileRoute("/rescisoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rescisões | Dashboard de Desligamentos" },
      { name: "description", content: "Painel analítico de desligamentos e rescisões de servidores municipais com filtros, KPIs e gráficos comparativos." },
    ],
  }),
  component: () => (
    <LoginGate>
      <RescisoesPage />
    </LoginGate>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Não encontrado</div>,
});

type DateRange = { from?: Date; to?: Date };

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toISO(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function RescisoesPage() {
  const { data } = useSuspenseQuery(rescisoesQuery);
  const { data: evolucoes } = useSuspenseQuery(evolucoesQuery);

  // Build per-servant aggregated info (joined by matricula)
  const aggregatedAll = useMemo(() => buildAggregated(data, evolucoes), [data, evolucoes]);

  // Bounds
  const bounds = useMemo(() => {
    let min = data[0]?.data_rescisao ?? "2024-01-01";
    let max = data[0]?.data_rescisao ?? "2026-12-31";
    for (const r of data) {
      if (r.data_rescisao < min) min = r.data_rescisao;
      if (r.data_rescisao > max) max = r.data_rescisao;
    }
    return { min, max };
  }, [data]);

  // Filters — date range is the GLOBAL period (shared across pages)
  const { period, setPeriod } = usePeriod();
  const dateRange: DateRange = {
    from: period.from ?? undefined,
    to: period.to ?? undefined,
  };
  const setDateRange = (r: DateRange) =>
    setPeriod({ from: r.from ?? null, to: r.to ?? null });
  const [secretarias, setSecretarias] = useState<string[]>([]);
  const [cargos, setCargos] = useState<string[]>([]);
  const [vinculos, setVinculos] = useState<string[]>(["Estatutário"]);
  const [evolStatus, setEvolStatus] = useState<"all" | "evolved" | "noevol">("all");
  const [tempoEvol, setTempoEvol] = useState<"all" | "lt1" | "1to3" | "gt3">("all");
  const [openJornada, setOpenJornada] = useState<Aggregated | null>(null);

  const allSecretarias = useMemo(
    () => [...new Set(data.map((r) => r.secretaria_nome))].sort(),
    [data],
  );
  const allCargos = useMemo(
    () => [...new Set(data.map((r) => r.cargo_nome))].sort(),
    [data],
  );

  // Apply filters
  const filtered = useMemo<Aggregated[]>(() => {
    const from = dateRange.from ? toISO(dateRange.from) : null;
    const to = dateRange.to ? toISO(dateRange.to) : null;
    return aggregatedAll.filter((r) => {
      if (from && r.data_rescisao < from) return false;
      if (to && r.data_rescisao > to) return false;
      if (vinculos.length && !vinculos.includes(r.vinculo_categoria)) return false;
      if (secretarias.length && !secretarias.includes(r.secretaria_nome)) return false;
      if (cargos.length && !cargos.includes(r.cargo_nome)) return false;
      if (evolStatus === "evolved" && !r.hasEvolucao) return false;
      if (evolStatus === "noevol" && r.hasEvolucao) return false;
      if (tempoEvol !== "all") {
        const d = r.diasUltimaEvolAteRescisao;
        if (d === null) return false;
        const years = d / 365.25;
        if (tempoEvol === "lt1" && years >= 1) return false;
        if (tempoEvol === "1to3" && (years < 1 || years > 3)) return false;
        if (tempoEvol === "gt3" && years <= 3) return false;
      }
      return true;
    });
  }, [aggregatedAll, dateRange, vinculos, secretarias, cargos, evolStatus, tempoEvol]);

  const clearAll = () => {
    setPeriod({ from: null, to: null });
    setSecretarias([]);
    setCargos([]);
    setVinculos(["Estatutário"]);
    setEvolStatus("all");
    setTempoEvol("all");
  };

  const hasFilters =
    !!dateRange.from || !!dateRange.to || secretarias.length || cargos.length ||
    vinculos.length !== 1 || vinculos[0] !== "Estatutário";

  // Shortcuts
  const applyYear = (y: number) =>
    setDateRange({ from: new Date(y, 0, 1), to: new Date(y, 11, 31) });
  const applyLast6Months = () => {
    const to = new Date();
    setDateRange({ from: subMonths(to, 6), to });
  };
  const applyAllPeriod = () =>
    setDateRange({ from: parseISO(bounds.min), to: parseISO(bounds.max) });

  return (
    <div className="min-h-screen bg-background">
      <FiltersBar
        dateRange={dateRange}
        setDateRange={setDateRange}
        allSecretarias={allSecretarias}
        secretarias={secretarias}
        setSecretarias={setSecretarias}
        allCargos={allCargos}
        cargos={cargos}
        setCargos={setCargos}
        vinculos={vinculos}
        setVinculos={setVinculos}
        evolStatus={evolStatus}
        setEvolStatus={setEvolStatus}
        tempoEvol={tempoEvol}
        setTempoEvol={setTempoEvol}
        onClear={clearAll}
        hasFilters={!!hasFilters}
        applyYear={applyYear}
        applyLast6Months={applyLast6Months}
        applyAllPeriod={applyAllPeriod}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard de Rescisões</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length.toLocaleString("pt-BR")} registros • Vínculo padrão: Estatutário
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GlobalPeriodFilter />
            <Button asChild variant="ghost" size="sm">
              <Link to="/"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
            </Button>
          </div>
        </div>

        <KpiCards data={filtered} dateRange={dateRange} all={data} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MotivoDonut data={filtered} />
          <TrendLines data={filtered} />
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3">Evolução Funcional & Pós-Promoção</h2>
          <EvolucaoAnalysis aggregated={filtered} />
        </div>

        <YearCompare
          data={data}
          vinculos={vinculos}
          secretarias={secretarias}
          cargos={cargos}
          aggregatedAll={aggregatedAll}
        />

        <CargoDeepDive data={filtered} allCargos={allCargos} />

        <DetailsTable data={filtered} onRowClick={setOpenJornada} />

        <PeriodComparator
          compute={(fromISO, toISO) => {
            const inRange = (d: string | null | undefined) =>
              !!d && d >= fromISO && d <= toISO;
            const rs = data.filter((r) => inRange(r.data_rescisao));
            const ests = rs.filter(
              (r) => (r.vinculo_categoria || "").toLowerCase().includes("estatut"),
            );
            const aposentados = rs.filter((r) =>
              ((r as any).motivo_categoria || (r as any).motivo_descricao || "")
                .toLowerCase()
                .includes("aposent"),
            );
            const exonerados = rs.filter((r) =>
              ((r as any).motivo_categoria || (r as any).motivo_descricao || "")
                .toLowerCase()
                .includes("exoner"),
            );
            return [
              { label: "Total Rescisões", value: rs.length },
              { label: "Estatutários", value: ests.length },
              { label: "Aposentadorias", value: aposentados.length },
              { label: "Exonerações", value: exonerados.length },
            ] as MetricResult[];
          }}
        />
      </div>

      {openJornada && (
        <JornadaTimeline
          open={!!openJornada}
          onClose={() => setOpenJornada(null)}
          nome={openJornada.nome}
          matricula={openJornada.matricula ?? ""}
          eventos={openJornada.eventos}
        />
      )}
    </div>
  );
}

function FiltersBar(props: {
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  allSecretarias: string[];
  secretarias: string[];
  setSecretarias: (s: string[]) => void;
  allCargos: string[];
  cargos: string[];
  setCargos: (s: string[]) => void;
  vinculos: string[];
  setVinculos: (s: string[]) => void;
  evolStatus: "all" | "evolved" | "noevol";
  setEvolStatus: (v: "all" | "evolved" | "noevol") => void;
  tempoEvol: "all" | "lt1" | "1to3" | "gt3";
  setTempoEvol: (v: "all" | "lt1" | "1to3" | "gt3") => void;
  onClear: () => void;
  hasFilters: boolean;
  applyYear: (y: number) => void;
  applyLast6Months: () => void;
  applyAllPeriod: () => void;
}) {
  const { dateRange, setDateRange } = props;
  const periodLabel =
    dateRange.from && dateRange.to
      ? `${format(dateRange.from, "dd/MM/yyyy")} — ${format(dateRange.to, "dd/MM/yyyy")}`
      : "Selecione o período";

  return (
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm">{periodLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(r) => setDateRange({ from: r?.from, to: r?.to })}
              numberOfMonths={2}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="border-t p-2 flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => props.applyYear(2024)}>2024</Button>
              <Button size="sm" variant="ghost" onClick={() => props.applyYear(2025)}>2025</Button>
              <Button size="sm" variant="ghost" onClick={() => props.applyYear(2026)}>2026</Button>
              <Button size="sm" variant="ghost" onClick={props.applyLast6Months}>Últimos 6 meses</Button>
              <Button size="sm" variant="ghost" onClick={props.applyAllPeriod}>Todo o período</Button>
              {(dateRange.from || dateRange.to) && (
                <Button size="sm" variant="ghost" onClick={() => setDateRange({})}>Limpar</Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <MultiSelect
          label="Secretaria"
          options={props.allSecretarias}
          selected={props.secretarias}
          onChange={props.setSecretarias}
        />
        <MultiSelect
          label="Cargo"
          options={props.allCargos}
          selected={props.cargos}
          onChange={props.setCargos}
        />
        <MultiSelect
          label="Vínculo"
          options={[...VINCULOS]}
          selected={props.vinculos}
          onChange={props.setVinculos}
          searchable={false}
        />

        <Select value={props.evolStatus} onValueChange={(v) => props.setEvolStatus(v as any)}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Status de Evolução" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Evolução: Todos</SelectItem>
            <SelectItem value="evolved">Evoluíram antes de sair</SelectItem>
            <SelectItem value="noevol">Saíram sem evoluir</SelectItem>
          </SelectContent>
        </Select>
        <Select value={props.tempoEvol} onValueChange={(v) => props.setTempoEvol(v as any)}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Tempo desde evolução" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tempo desde última evolução</SelectItem>
            <SelectItem value="lt1">Menos de 1 ano</SelectItem>
            <SelectItem value="1to3">1 a 3 anos</SelectItem>
            <SelectItem value="gt3">Mais de 3 anos</SelectItem>
          </SelectContent>
        </Select>

        {props.hasFilters && (
          <Button variant="ghost" size="sm" onClick={props.onClear} className="ml-auto">
            <X className="h-4 w-4" /> Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}

function KpiCards({ data, dateRange, all }: { data: Rescisao[]; dateRange: DateRange; all: Rescisao[] }) {
  const total = data.length;

  const monthsCount = useMemo(() => {
    if (data.length === 0) return 1;
    let min = data[0].data_rescisao, max = data[0].data_rescisao;
    for (const r of data) {
      if (r.data_rescisao < min) min = r.data_rescisao;
      if (r.data_rescisao > max) max = r.data_rescisao;
    }
    return Math.max(1, differenceInMonths(parseISO(max), parseISO(min)) + 1);
  }, [data]);

  const mediaMes = total / monthsCount;

  const topSec = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data) m.set(r.secretaria_nome, (m.get(r.secretaria_nome) ?? 0) + 1);
    const arr = [...m.entries()].sort((a, b) => b[1] - a[1]);
    return arr[0] ?? ["—", 0];
  }, [data]);

  const topMotivos = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data) m.set(r.motivo_categoria, (m.get(r.motivo_categoria) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [data]);

  // Comparison with previous period of same duration
  const variation = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return null;
    const ms = dateRange.to.getTime() - dateRange.from.getTime();
    const prevTo = new Date(dateRange.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - ms);
    const prevFromISO = toISO(prevFrom);
    const prevToISO = toISO(prevTo);
    const prev = all.filter(
      (r) => r.data_rescisao >= prevFromISO && r.data_rescisao <= prevToISO,
    ).length;
    if (prev === 0) return null;
    return ((total - prev) / prev) * 100;
  }, [dateRange, all, total]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Baixas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{total.toLocaleString("pt-BR")}</div>
          <p className="text-xs text-muted-foreground mt-1">no período selecionado</p>
          {variation !== null && (
            <div className={cn("flex items-center gap-1 text-xs mt-2", variation >= 0 ? "text-destructive" : "text-emerald-600")}>
              {variation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {variation >= 0 ? "+" : ""}{variation.toFixed(1)}% vs período anterior
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Média Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{mediaMes.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground mt-1">desligamentos/mês</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Secretaria Líder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
            <div>
              <div className="text-sm font-semibold leading-tight line-clamp-2">{topSec[0]}</div>
              <div className="text-lg font-bold">{topSec[1]}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">maior volume de saídas</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Motivos Top 3</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {topMotivos.map(([m, c]) => {
            const pct = total > 0 ? (c / total) * 100 : 0;
            return (
              <div key={m} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="truncate">{m}</span>
                  <span className="font-medium">{c}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: MOTIVO_COLORS[m] }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function MotivoDonut({ data }: { data: Aggregated[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const chart = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data) m.set(r.motivo_categoria, (m.get(r.motivo_categoria) ?? 0) + 1);
    return MOTIVOS_ORDER
      .filter((mt) => m.has(mt))
      .map((mt) => ({ name: mt, value: m.get(mt)!, fill: MOTIVO_COLORS[mt] }));
  }, [data]);
  const total = data.length;
  const selRows = useMemo(
    () => (sel ? data.filter((r) => r.motivo_categoria === sel) : []),
    [data, sel],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Motivo</CardTitle>
        <p className="text-xs text-muted-foreground">Clique numa fatia para ver os servidores</p>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chart}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                cursor="pointer"
                onClick={(d: any) => d?.name && setSel(d.name)}
              >
                {chart.map((e) => <Cell key={e.name} fill={e.fill} />)}
              </Pie>
              <RTooltip
                formatter={(v: number, n: string) => [`${v} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`, n]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">{total}</span></div>
        {sel && (
          <ServidoresListDialog
            open
            onClose={() => setSel(null)}
            title={`Motivo: ${sel}`}
            rows={selRows}
          />
        )}
      </CardContent>
    </Card>
  );
}

function TrendLines({ data }: { data: Rescisao[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const { rows, motivosPresentes } = useMemo(() => {
    if (data.length === 0) return { rows: [], motivosPresentes: [] as string[] };
    let min = data[0].data_rescisao, max = data[0].data_rescisao;
    for (const r of data) {
      if (r.data_rescisao < min) min = r.data_rescisao;
      if (r.data_rescisao > max) max = r.data_rescisao;
    }
    const start = startOfMonth(parseISO(min));
    const end = startOfMonth(parseISO(max));
    const months: string[] = [];
    let cur = start;
    while (cur <= end) {
      months.push(format(cur, "yyyy-MM"));
      cur = addMonths(cur, 1);
    }
    const motivosSet = new Set<string>();
    const grouped: Record<string, Record<string, number>> = {};
    for (const m of months) grouped[m] = {};
    for (const r of data) {
      const key = r.data_rescisao.slice(0, 7);
      motivosSet.add(r.motivo_categoria);
      grouped[key][r.motivo_categoria] = (grouped[key][r.motivo_categoria] ?? 0) + 1;
    }
    const presentes = MOTIVOS_ORDER.filter((m) => motivosSet.has(m));
    const rows = months.map((m) => {
      const row: any = { mes: format(parseISO(m + "-01"), "MMM/yy", { locale: ptBR }) };
      for (const mt of presentes) row[mt] = grouped[m][mt] ?? 0;
      return row;
    });
    return { rows, motivosPresentes: presentes };
  }, [data]);

  const toggle = (m: string) => {
    setHidden((prev) => {
      const n = new Set(prev);
      if (n.has(m)) n.delete(m); else n.add(m);
      return n;
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Tendência por Motivo (Mensal)</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Legend wrapperStyle={{ fontSize: 12, cursor: "pointer" }} onClick={(o: any) => toggle(o.dataKey)} />
              {motivosPresentes.map((m) => (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={m}
                  stroke={MOTIVO_COLORS[m]}
                  strokeWidth={2}
                  dot={false}
                  hide={hidden.has(m)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function YearCompare({
  data, vinculos, secretarias, cargos, aggregatedAll,
}: {
  data: Rescisao[]; vinculos: string[]; secretarias: string[]; cargos: string[];
  aggregatedAll: Aggregated[];
}) {
  // Same filters except date — compare years
  const filtered = useMemo(() => data.filter((r) => {
    if (vinculos.length && !vinculos.includes(r.vinculo_categoria)) return false;
    if (secretarias.length && !secretarias.includes(r.secretaria_nome)) return false;
    if (cargos.length && !cargos.includes(r.cargo_nome)) return false;
    return true;
  }), [data, vinculos, secretarias, cargos]);

  const years = useMemo(() => {
    const s = new Set<string>();
    for (const r of filtered) s.add(r.data_rescisao.slice(0, 4));
    return [...s].sort();
  }, [filtered]);

  const rows = useMemo(() => {
    const motivosSet = new Set<string>();
    const grouped: Record<string, Record<string, number>> = {};
    for (const y of years) grouped[y] = {};
    for (const r of filtered) {
      const y = r.data_rescisao.slice(0, 4);
      motivosSet.add(r.motivo_categoria);
      grouped[y][r.motivo_categoria] = (grouped[y][r.motivo_categoria] ?? 0) + 1;
    }
    const motivos = MOTIVOS_ORDER.filter((m) => motivosSet.has(m));
    return {
      data: years.map((y) => {
        const row: any = { ano: y };
        for (const m of motivos) row[m] = grouped[y][m] ?? 0;
        return row;
      }),
      motivos,
    };
  }, [filtered, years]);

  const [stacked, setStacked] = useState(false);
  const [drill, setDrill] = useState<{ ano: string; motivo: string } | null>(null);
  const drillRows = useMemo(() => {
    if (!drill) return [];
    return aggregatedAll.filter(
      (a) =>
        a.data_rescisao?.slice(0, 4) === drill.ano &&
        a.motivo_categoria === drill.motivo,
    );
  }, [drill, aggregatedAll]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Comparativo Anual</CardTitle>
          <p className="text-xs text-muted-foreground">Clique numa coluna para listar os servidores.</p>
        </div>
        <Tabs value={stacked ? "stack" : "group"} onValueChange={(v) => setStacked(v === "stack")}>
          <TabsList className="h-8">
            <TabsTrigger value="group" className="text-xs">Agrupado</TabsTrigger>
            <TabsTrigger value="stack" className="text-xs">Empilhado</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {rows.motivos.map((m) => (
                <Bar
                  key={m}
                  dataKey={m}
                  fill={MOTIVO_COLORS[m]}
                  stackId={stacked ? "a" : undefined}
                  radius={stacked ? 0 : [4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) => {
                    const ano = d?.ano as string | undefined;
                    if (ano) setDrill({ ano, motivo: m });
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {drill && (
          <ServidoresListDialog
            open
            onClose={() => setDrill(null)}
            title={`${drill.motivo} • ${drill.ano}`}
            rows={drillRows}
          />
        )}
      </CardContent>
    </Card>
  );
}

function CargoDeepDive({ data, allCargos }: { data: Rescisao[]; allCargos: string[] }) {
  const [cargo, setCargo] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const cargosDisponiveis = useMemo(() => {
    const s = new Set<string>();
    for (const r of data) s.add(r.cargo_nome);
    return allCargos.filter((c) => s.has(c));
  }, [data, allCargos]);

  const filtered = useMemo(() => cargo ? data.filter((r) => r.cargo_nome === cargo) : [], [data, cargo]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const mediaMeses = filtered.reduce((s, r) => s + r.dias_permanencia, 0) / filtered.length / 30.44;
    // Histogram
    const buckets = { "0-6m": 0, "6-12m": 0, "1-2a": 0, "2-5a": 0, "5a+": 0 };
    for (const r of filtered) {
      const m = r.dias_permanencia / 30.44;
      if (m < 6) buckets["0-6m"]++;
      else if (m < 12) buckets["6-12m"]++;
      else if (m < 24) buckets["1-2a"]++;
      else if (m < 60) buckets["2-5a"]++;
      else buckets["5a+"]++;
    }
    // Motivos
    const motivos = new Map<string, number>();
    for (const r of filtered) motivos.set(r.motivo_categoria, (motivos.get(r.motivo_categoria) ?? 0) + 1);
    const motivoChart = MOTIVOS_ORDER.filter((m) => motivos.has(m))
      .map((m) => ({ name: m, value: motivos.get(m)!, fill: MOTIVO_COLORS[m] }));
    // Mensal
    const ms = new Map<string, number>();
    for (const r of filtered) {
      const k = r.data_rescisao.slice(0, 7);
      ms.set(k, (ms.get(k) ?? 0) + 1);
    }
    const mensal = [...ms.entries()].sort().map(([k, v]) => ({
      mes: format(parseISO(k + "-01"), "MMM/yy", { locale: ptBR }),
      qtd: v,
    }));
    // Secretarias
    const sec = new Map<string, number>();
    for (const r of filtered) sec.set(r.secretaria_nome, (sec.get(r.secretaria_nome) ?? 0) + 1);
    const topSec = [...sec.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { mediaMeses, buckets, motivoChart, mensal, topSec };
  }, [filtered]);

  const opts = useMemo(() => {
    if (!q.trim()) return cargosDisponiveis.slice(0, 100);
    const s = q.toLowerCase();
    return cargosDisponiveis.filter((c) => c.toLowerCase().includes(s)).slice(0, 100);
  }, [cargosDisponiveis, q]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>Análise Profunda por Cargo</CardTitle>
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 min-w-[260px] justify-between">
                <span className="truncate text-sm">{cargo || "Selecionar cargo..."}</span>
                <Search className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0" align="end">
              <div className="p-2 border-b">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cargo..." className="h-8" />
              </div>
              <div className="max-h-72 overflow-auto p-1">
                {opts.map((c) => (
                  <button key={c} onClick={() => { setCargo(c); setOpen(false); }}
                    className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent">
                    {c}
                  </button>
                ))}
                {opts.length === 0 && <div className="text-xs text-muted-foreground p-2">Nenhum cargo</div>}
              </div>
            </PopoverContent>
          </Popover>
          {cargo && (
            <Button variant="ghost" size="sm" onClick={() => setCargo("")}>
              <X className="h-4 w-4" /> Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!cargo && (
          <div className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-md">
            Selecione um cargo para visualizar análise detalhada
          </div>
        )}
        {cargo && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground uppercase mb-1">Permanência Média</div>
              <div className="text-3xl font-bold">{stats.mediaMeses.toFixed(0)}<span className="text-base font-normal text-muted-foreground"> meses</span></div>
              <div className="mt-3 space-y-1">
                {Object.entries(stats.buckets).map(([k, v]) => {
                  const pct = filtered.length ? (v / filtered.length) * 100 : 0;
                  return (
                    <div key={k}>
                      <div className="flex justify-between text-xs">
                        <span>{k}</span><span>{v}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground uppercase mb-2">Motivos de Saída</div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.motivoChart} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                      {stats.motivoChart.map((e) => <Cell key={e.name} fill={e.fill} />)}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground uppercase mb-2">Evolução Mensal</div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.mensal}>
                    <Area type="monotone" dataKey="qtd" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                    <RTooltip />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} hide />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-muted-foreground text-center">{stats.mensal.length} meses</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground uppercase mb-2">Top 5 Secretarias</div>
              <div className="space-y-2">
                {stats.topSec.map(([s, c]) => {
                  const pct = filtered.length ? (c / filtered.length) * 100 : 0;
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs gap-2">
                        <span className="truncate">{s}</span>
                        <span className="font-medium shrink-0">{c}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SortKey = "cargo_nome" | "secretaria_nome" | "data_admissao" | "data_rescisao" | "vinculo_categoria" | "motivo_categoria";

function DetailsTable({ data, onRowClick }: { data: Aggregated[]; onRowClick?: (r: Aggregated) => void }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("data_rescisao");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const s = search.toLowerCase();
    return data.filter((r) =>
      r.nome.toLowerCase().includes(s) ||
      r.cargo_nome.toLowerCase().includes(s) ||
      r.secretaria_nome.toLowerCase().includes(s) ||
      r.motivo_categoria.toLowerCase().includes(s),
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = (a as any)[sortKey] ?? "";
      const vb = (b as any)[sortKey] ?? "";
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const curPage = Math.min(page, totalPages - 1);
  const pageData = sorted.slice(curPage * pageSize, curPage * pageSize + pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(true); }
  };

  const motivoBadge = (m: string) => {
    const variants: Record<string, string> = {
      "Justa Causa": "bg-destructive/15 text-destructive border-destructive/30",
      "Aposentadoria": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      "Falecimento": "bg-muted text-muted-foreground",
      "Pedido de Demissão": "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
      "Fim de Contrato": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
      "Sem Justa Causa": "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
      "Outros": "bg-muted text-muted-foreground",
    };
    return <Badge variant="outline" className={variants[m] ?? ""}>{m}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle>Registros</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar..."
              className="h-9 pl-8 w-[220px]"
            />
          </div>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
            <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-2">
          Mostrando {pageData.length} de {sorted.length.toLocaleString("pt-BR")} registros
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortBtn label="Cargo" k="cargo_nome" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Secretaria" k="secretaria_nome" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Admissão" k="data_admissao" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Rescisão" k="data_rescisao" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Vínculo" k="vinculo_categoria" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Motivo" k="motivo_categoria" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((r) => (
                <TableRow
                  key={r.id}
                  className={onRowClick ? "cursor-pointer hover:bg-accent/50" : ""}
                  onClick={() => onRowClick?.(r)}
                >
                  <TableCell className="text-xs">
                    <div className="font-medium">{r.cargo_nome}</div>
                    <div className="text-muted-foreground">{r.nome}</div>
                  </TableCell>
                  <TableCell className="text-xs max-w-[220px]">{r.secretaria_nome}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.data_admissao)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.data_rescisao)}</TableCell>
                  <TableCell className="text-xs"><Badge variant="secondary">{r.vinculo_categoria}</Badge></TableCell>
                  <TableCell>{motivoBadge(r.motivo_categoria)}</TableCell>
                </TableRow>
              ))}
              {pageData.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-muted-foreground">Página {curPage + 1} de {totalPages}</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={curPage === 0}>«</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(curPage - 1)} disabled={curPage === 0}>‹</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(curPage + 1)} disabled={curPage >= totalPages - 1}>›</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={curPage >= totalPages - 1}>»</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortBtn({ label, k, cur, asc, on }: { label: string; k: SortKey; cur: SortKey; asc: boolean; on: (k: SortKey) => void }) {
  return (
    <button onClick={() => on(k)} className="flex items-center gap-1 hover:text-foreground">
      {label}
      <ArrowUpDown className={cn("h-3 w-3", cur === k ? "opacity-100" : "opacity-30")} />
      {cur === k && <span className="text-[10px]">{asc ? "↑" : "↓"}</span>}
    </button>
  );
}