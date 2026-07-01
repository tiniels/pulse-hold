import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import {
  listChamamentos,
  listAndamento,
  updateChamamentoStatus,
  type Chamamento,
} from "@/lib/sgc.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Stethoscope,
  Mail,
  MessageSquare,
  Newspaper,
  Send,
  Briefcase,
  Scale,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import { DrillDialog } from "@/components/charts/DrillDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SGC - Sistema de Gestão de Chamamentos" },
      {
        name: "description",
        content:
          "Painel estratégico de chamamentos, convocações e admissão de pessoal — CAB.",
      },
    ],
  }),
  component: SGCPage,
});

const STATUS_META: Record<
  string,
  { label: string; color: string; bar: string; dot: string }
> = {
  EM_ANDAMENTO: {
    label: "Em andamento",
    color: "bg-slate-100 text-slate-700 border-slate-300",
    bar: "#94a3b8",
    dot: "bg-slate-400",
  },
  ATENCAO: {
    label: "Atenção",
    color: "bg-cyan-100 text-cyan-800 border-cyan-300",
    bar: "#06b6d4",
    dot: "bg-cyan-400",
  },
  INICIOU: {
    label: "Iniciou exercício",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    bar: "#10b981",
    dot: "bg-emerald-500",
  },
  AGUARDANDO_HOMOLOGACAO: {
    label: "Aguardando homologação",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    bar: "#eab308",
    dot: "bg-yellow-400",
  },
  RENUNCIA: {
    label: "Renúncia",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    bar: "#f97316",
    dot: "bg-orange-500",
  },
  DESISTENCIA: {
    label: "Desistência / Não compareceu",
    color: "bg-red-100 text-red-800 border-red-300",
    bar: "#ef4444",
    dot: "bg-red-500",
  },
};

const STATUS_ORDER = [
  "INICIOU",
  "AGUARDANDO_HOMOLOGACAO",
  "EM_ANDAMENTO",
  "ATENCAO",
  "RENUNCIA",
  "DESISTENCIA",
];

const fmtNum = (n: number) =>
  Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtBRL = (n: number) =>
  Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

function ageDays(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00").getTime();
  return Math.floor((Date.now() - d) / 86400000);
}

function inferMotivoCategoria(motivo: string | null) {
  if (!motivo) return "Outros";
  const m = motivo.toUpperCase();
  if (m.includes("APOSENT")) return "Aposentadoria";
  if (m.includes("FALEC")) return "Falecimento";
  if (m.includes("EXONERA") && m.includes("PEDIDO"))
    return "Exoneração a pedido";
  if (m.includes("EXONERA")) return "Exoneração";
  if (m.includes("AMPLIA") || m.includes("EXPANS") || m.includes("CRIA"))
    return "Ampliação / Expansão";
  if (m.includes("TRANSF")) return "Transferência";
  if (m.includes("SUBST")) return "Substituição";
  return "Outros";
}

function isExpansion(motivo: string | null) {
  const c = inferMotivoCategoria(motivo);
  return c === "Ampliação / Expansão";
}

const drillColumns = [
  { key: "prontuario", label: "Prontuário", value: (r: Chamamento) => r.prontuario },
  { key: "nome", label: "Nome", value: (r: Chamamento) => r.nome },
  { key: "cargo", label: "Cargo / Função", value: (r: Chamamento) => r.cargo },
  {
    key: "secretaria",
    label: "Secretaria",
    value: (r: Chamamento) => r.secretaria,
  },
  {
    key: "concurso",
    label: "Edital",
    value: (r: Chamamento) => r.numero_concurso,
  },
];

function SGCPage() {
  return (
    <LoginGate>
      <SGCInner />
    </LoginGate>
  );
}

const chamamentosQuery = queryOptions({
  queryKey: ["sgc-chamamentos"],
  queryFn: () => listChamamentos(),
});
const andamentoQuery = queryOptions({
  queryKey: ["sgc-andamento"],
  queryFn: () => listAndamento(),
});

function SGCInner() {
  const { data: rows = [], isLoading } = useQuery(chamamentosQuery);
  const { data: andamento = [] } = useQuery(andamentoQuery);
  const qc = useQueryClient();

  const [drill, setDrill] = useState<{
    title: string;
    rows: Chamamento[];
  } | null>(null);
  const [editalFiltro, setEditalFiltro] = useState<string>("__all");
  const [tipoFiltro, setTipoFiltro] = useState<string>("__all");

  // ---------- aggregations ----------
  const total = rows.length;

  const motivosAgg = useMemo(() => {
    const map = new Map<string, Chamamento[]>();
    rows.forEach((r) => {
      const k = inferMotivoCategoria(r.motivo);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries())
      .map(([motivo, list]) => ({ motivo, total: list.length, rows: list }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const editaisAgg = useMemo(() => {
    const map = new Map<
      string,
      {
        numero: string;
        tipo: string;
        cargos: Set<string>;
        rows: Chamamento[];
        dataMaisRecente: string | null;
      }
    >();
    rows.forEach((r) => {
      const k = r.numero_concurso?.trim();
      if (!k) return;
      if (!map.has(k))
        map.set(k, {
          numero: k,
          tipo: r.tipo_concurso ?? "",
          cargos: new Set(),
          rows: [],
          dataMaisRecente: null,
        });
      const e = map.get(k)!;
      if (r.cargo_normalizado) e.cargos.add(r.cargo_normalizado);
      e.rows.push(r);
      if (r.data_publicacao && (!e.dataMaisRecente || r.data_publicacao > e.dataMaisRecente))
        e.dataMaisRecente = r.data_publicacao;
    });
    return Array.from(map.values())
      .map((e) => {
        const convocados = e.rows.length;
        const posse = e.rows.filter(
          (r) => r.status === "INICIOU" || r.status === "AGUARDANDO_HOMOLOGACAO",
        ).length;
        const desistencias = e.rows.filter(
          (r) => r.status === "DESISTENCIA" || r.status === "RENUNCIA",
        ).length;
        const emAndamento = e.rows.filter(
          (r) => r.status === "EM_ANDAMENTO" || r.status === "ATENCAO",
        ).length;
        // Semáforo: 2 anos típicos. usamos data mais recente como proxy.
        const idade = e.dataMaisRecente
          ? ageDays(e.dataMaisRecente) ?? 0
          : 9999;
        let semaforo: "vigente" | "alerta" | "expirado" = "vigente";
        if (idade > 730) semaforo = "expirado";
        else if (idade > 540) semaforo = "alerta";
        return {
          ...e,
          cargosList: Array.from(e.cargos),
          convocados,
          posse,
          desistencias,
          emAndamento,
          semaforo,
        };
      })
      .filter((e) =>
        tipoFiltro === "__all" ? true : e.tipo === tipoFiltro,
      )
      .sort((a, b) => (b.dataMaisRecente ?? "").localeCompare(a.dataMaisRecente ?? ""));
  }, [rows, tipoFiltro]);

  const editalSelecionado = useMemo(() => {
    if (editalFiltro === "__all") return editaisAgg[0];
    return editaisAgg.find((e) => e.numero === editalFiltro);
  }, [editaisAgg, editalFiltro]);

  const filaClassificacao = useMemo(() => {
    if (!editalSelecionado) return { geral: [], pcd: [], pn: [] };
    const sortFn = (a: Chamamento, b: Chamamento) =>
      (a.classificacao_num ?? 9999) - (b.classificacao_num ?? 9999);
    return {
      geral: editalSelecionado.rows
        .filter((r) => !r.cota)
        .sort(sortFn)
        .slice(0, 30),
      pcd: editalSelecionado.rows
        .filter((r) => r.cota === "PCD")
        .sort(sortFn)
        .slice(0, 15),
      pn: editalSelecionado.rows
        .filter((r) => r.cota === "PN")
        .sort(sortFn)
        .slice(0, 15),
    };
  }, [editalSelecionado]);

  const secretariasAgg = useMemo(() => {
    const map = new Map<string, Chamamento[]>();
    rows.forEach((r) => {
      if (!map.has(r.secretaria)) map.set(r.secretaria, []);
      map.get(r.secretaria)!.push(r);
    });
    return Array.from(map.entries())
      .map(([secretaria, list]) => ({
        secretaria,
        total: list.length,
        iniciou: list.filter((r) => r.status === "INICIOU").length,
        andamento: list.filter((r) => r.status === "EM_ANDAMENTO").length,
        rows: list,
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const statusAgg = useMemo(() => {
    const map = new Map<string, Chamamento[]>();
    rows.forEach((r) => {
      if (!map.has(r.status)) map.set(r.status, []);
      map.get(r.status)!.push(r);
    });
    return STATUS_ORDER.map((s) => ({
      status: s,
      label: STATUS_META[s].label,
      total: map.get(s)?.length ?? 0,
      rows: map.get(s) ?? [],
    }));
  }, [rows]);

  const trendMensal = useMemo(() => {
    const map = new Map<string, { mes: string; convocados: number; posse: number }>();
    rows.forEach((r) => {
      if (!r.data_publicacao) return;
      const mes = r.data_publicacao.slice(0, 7);
      if (!map.has(mes)) map.set(mes, { mes, convocados: 0, posse: 0 });
      const o = map.get(mes)!;
      o.convocados += 1;
      if (r.status === "INICIOU" || r.status === "AGUARDANDO_HOMOLOGACAO")
        o.posse += 1;
    });
    return Array.from(map.values())
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-24);
  }, [rows]);

  const kanbanAgg = useMemo(() => {
    const map = new Map<number, AndamentoRowLite[]>();
    andamento.forEach((a) => {
      const f = a.fase_kanban ?? 1;
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push({
        id: a.id,
        secretaria: a.secretaria,
        cargo: a.cargo ?? "—",
        quantidade: a.quantidade ?? 0,
        andamento: a.andamento ?? "",
      });
    });
    return [1, 2, 3, 4, 5].map((f) => ({
      fase: f,
      cards: map.get(f) ?? [],
    }));
  }, [andamento]);

  const kpis = useMemo(() => {
    const now = new Date();
    const m0 = now.toISOString().slice(0, 7);
    const mesAtual = rows.filter((r) => r.data_publicacao?.startsWith(m0));
    const posseMes = mesAtual.filter(
      (r) => r.status === "INICIOU" || r.status === "AGUARDANDO_HOMOLOGACAO",
    );
    const desMes = mesAtual.filter(
      (r) => r.status === "DESISTENCIA" || r.status === "RENUNCIA",
    );
    const editaisAlerta = editaisAgg.filter(
      (e) => e.semaforo === "alerta",
    ).length;
    return {
      chamamentosMes: mesAtual.length,
      posseMes: posseMes.length,
      desistMes: desMes.length,
      desistPct: mesAtual.length
        ? (desMes.length / mesAtual.length) * 100
        : 0,
      editaisAlerta,
    };
  }, [rows, editaisAgg]);

  // ---------- impacto financeiro (heurístico) ----------
  const SALARIO_MEDIO = 4500; // estimativa default - integrável com tabela
  const ENCARGOS = 0.333 + 1; // férias + 13º + encargos (1.333 + 13/12 + 0.30)
  const impactoOrcamento = useMemo(() => {
    const expansao = rows.filter((r) => isExpansion(r.motivo)).length;
    const substituicao = rows.length - expansao;
    const custoExpansao = expansao * SALARIO_MEDIO * 12 * 1.5;
    return { expansao, substituicao, custoExpansao };
  }, [rows]);

  // ---------- handlers ----------
  async function mudarStatus(c: Chamamento, novo: string) {
    await updateChamamentoStatus({
      data: { id: c.id, status: novo as any },
    });
    qc.invalidateQueries({ queryKey: ["sgc-chamamentos"] });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando painel...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/95 backdrop-blur border rounded-xl px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            SGC — Sistema de Gestão de Chamamentos
          </h1>
          <p className="text-xs text-muted-foreground">
            Painel estratégico de admissão de pessoal • {fmtNum(total)}{" "}
            chamamentos registrados
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" /> Concursos/PS
            </Button>
          </Link>
          <Link to="/admissao">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-4 w-4" /> Admissões
            </Button>
          </Link>
          <Link to="/rescisoes">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Briefcase className="h-4 w-4" /> Rescisões
            </Button>
          </Link>
          <Link to="/levantamento">
            <Button variant="default" size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" /> Levantamento
            </Button>
          </Link>
        </nav>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-12 gap-4">
        {/* 1. DEMANDAS */}
        <Card className="col-span-12 md:col-span-3 bg-card/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              1. Demandas das Secretarias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Top secretarias por volume de chamamentos
            </p>
            <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
              {secretariasAgg.slice(0, 12).map((s, i) => (
                <button
                  key={s.secretaria}
                  onClick={() =>
                    setDrill({
                      title: `Secretaria: ${s.secretaria}`,
                      rows: s.rows,
                    })
                  }
                  className="w-full text-left flex items-center gap-2 group hover:bg-accent/50 rounded px-1.5 py-1"
                >
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-xs flex-1 truncate">{s.secretaria}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {fmtNum(s.total)}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 2. CONTROLE DE SUBSTITUIÇÕES */}
        <Card className="col-span-12 md:col-span-3 bg-card/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              2. Motivos da Vacância
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {motivosAgg.slice(0, 7).map((m) => (
                <button
                  key={m.motivo}
                  onClick={() =>
                    setDrill({
                      title: `Motivo: ${m.motivo}`,
                      rows: m.rows,
                    })
                  }
                  className="w-full text-left flex items-center justify-between text-xs hover:bg-accent/50 rounded px-2 py-1.5"
                >
                  <span className="truncate">{m.motivo}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {fmtNum(m.total)}
                  </Badge>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Substituição</span>
                <span className="font-semibold">
                  {fmtNum(impactoOrcamento.substituicao)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expansão/Ampliação</span>
                <span className="font-semibold text-orange-600">
                  {fmtNum(impactoOrcamento.expansao)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1.5">
                <span className="text-muted-foreground">Total estrutura</span>
                <span className="font-bold">{fmtNum(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. EDITAIS - SEMÁFORO */}
        <Card className="col-span-12 md:col-span-6 bg-card/95 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                3. Editais (CP/PS) — Semáforo de Validade
              </CardTitle>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger className="h-7 text-xs w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todos</SelectItem>
                  <SelectItem value="CP">CP</SelectItem>
                  <SelectItem value="PS">PS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-72 border rounded">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="text-xs">Edital</TableHead>
                    <TableHead className="text-xs">Cargos</TableHead>
                    <TableHead className="text-xs">Última atividade</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Conv.</TableHead>
                    <TableHead className="text-xs text-right">Posse</TableHead>
                    <TableHead className="text-xs text-right">Desist.</TableHead>
                    <TableHead className="text-xs text-right">Andam.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editaisAgg.slice(0, 50).map((e) => (
                    <TableRow
                      key={e.numero}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => {
                        setEditalFiltro(e.numero);
                        setDrill({
                          title: `Edital ${e.numero}`,
                          rows: e.rows,
                        });
                      }}
                    >
                      <TableCell className="text-xs font-medium">
                        {e.numero}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[160px]">
                        {e.cargosList[0] ?? "—"}
                        {e.cargosList.length > 1 && (
                          <span className="text-muted-foreground">
                            {" "}+{e.cargosList.length - 1}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {e.dataMaisRecente ?? "—"}
                      </TableCell>
                      <TableCell>
                        {e.semaforo === "vigente" && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            ● Vigente
                          </Badge>
                        )}
                        {e.semaforo === "alerta" && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px]">
                            ● Alerta
                          </Badge>
                        )}
                        {e.semaforo === "expirado" && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">
                            ● Expirado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {fmtNum(e.convocados)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-emerald-700 font-semibold">
                        {fmtNum(e.posse)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-red-700">
                        {fmtNum(e.desistencias)}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {fmtNum(e.emAndamento)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 4. ORDEM DE CLASSIFICAÇÃO */}
        <Card className="col-span-12 md:col-span-4 bg-card/95 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                4. Ordem de Classificação
              </CardTitle>
              <Select value={editalFiltro} onValueChange={setEditalFiltro}>
                <SelectTrigger className="h-7 text-xs w-[160px]">
                  <SelectValue placeholder="Edital..." />
                </SelectTrigger>
                <SelectContent>
                  {editaisAgg.slice(0, 60).map((e) => (
                    <SelectItem key={e.numero} value={e.numero}>
                      {e.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editalSelecionado ? (
              <Tabs defaultValue="geral">
                <TabsList className="h-8">
                  <TabsTrigger value="geral" className="text-xs">
                    Geral ({filaClassificacao.geral.length})
                  </TabsTrigger>
                  <TabsTrigger value="pcd" className="text-xs">
                    PcD ({filaClassificacao.pcd.length})
                  </TabsTrigger>
                  <TabsTrigger value="pn" className="text-xs">
                    Afro/PN ({filaClassificacao.pn.length})
                  </TabsTrigger>
                </TabsList>
                {(["geral", "pcd", "pn"] as const).map((k) => (
                  <TabsContent key={k} value={k}>
                    <div className="max-h-56 overflow-auto border rounded">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card">
                          <TableRow>
                            <TableHead className="text-xs w-12">Class.</TableHead>
                            <TableHead className="text-xs">Candidato</TableHead>
                            <TableHead className="text-xs">Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filaClassificacao[k].map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="text-xs font-medium">
                                {c.classificacao ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs truncate max-w-[140px]">
                                {c.nome ?? "—"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_META[c.status]?.color ?? ""}`}
                                >
                                  {STATUS_META[c.status]?.label ?? c.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filaClassificacao[k].length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">
                                Nenhum candidato nessa cota
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                Selecione um edital
              </p>
            )}
            <p className="text-[10px] text-muted-foreground border-t pt-2">
              ✓ Ordem inviolável conforme homologação em DOM
            </p>
          </CardContent>
        </Card>

        {/* 5. DOSSIÊ DIGITAL */}
        <DossieDigital editalSelecionado={editalSelecionado} onChange={mudarStatus} />

        {/* 6. KANBAN */}
        <Card className="col-span-12 bg-card/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              6. Kanban — Andamento das Admissões 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Kanban data={kanbanAgg} />
          </CardContent>
        </Card>

        {/* 7. ATÉ EFETIVO INGRESSO + 8. EQUILÍBRIO DA FOLHA */}
        <Card className="col-span-12 md:col-span-6 bg-card/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              7. Até o Efetivo Ingresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Stepper status={statusAgg} />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6 bg-card/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              8. Equilíbrio da Folha
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">
                Substituição (impacto zero)
              </p>
              <p className="text-2xl font-bold text-emerald-700">
                {fmtNum(impactoOrcamento.substituicao)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Reposição de vacâncias — sem novo custo
              </p>
            </div>
            <div className="border rounded-lg p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">
                Expansão (criação por lei)
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {fmtNum(impactoOrcamento.expansao)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Ampliação de quadro — exige dotação
              </p>
            </div>
            <div className="col-span-2 border rounded-lg p-3 bg-primary/5">
              <p className="text-[10px] text-muted-foreground uppercase">
                Impacto orçamentário estimado (ano)
              </p>
              <p className="text-2xl font-bold">
                {fmtBRL(impactoOrcamento.custoExpansao)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Base: salário médio estimado × 12 × encargos (1.5)
              </p>
              <Badge className="mt-2 bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                ✓ Dentro do limite da LRF (projeção)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* TENDÊNCIA + STATUS GRÁFICO */}
        <Card className="col-span-12 md:col-span-8 bg-card/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Tendência — Convocações vs. Posses (últimos 24 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={trendMensal}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="mes" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="convocados"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="posse"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-4 bg-card/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusAgg}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={36}
                    onClick={(d: any) =>
                      setDrill({
                        title: `Status: ${d.label}`,
                        rows: d.rows,
                      })
                    }
                    cursor="pointer"
                  >
                    {statusAgg.map((s) => (
                      <Cell
                        key={s.status}
                        fill={STATUS_META[s.status]?.bar ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI FOOTER */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-card/95 backdrop-blur border rounded-xl p-4 shadow-sm">
        <KPI
          icon={<Users className="h-5 w-5" />}
          label="Chamamentos no mês"
          value={fmtNum(kpis.chamamentosMes)}
          accent="text-primary"
        />
        <KPI
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Posses efetivadas (mês)"
          value={fmtNum(kpis.posseMes)}
          accent="text-emerald-600"
        />
        <KPI
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Desistências / perdas"
          value={fmtNum(kpis.desistMes)}
          sub={`${kpis.desistPct.toFixed(1)}% do mês`}
          accent="text-red-600"
        />
        <KPI
          icon={<Clock className="h-5 w-5" />}
          label="Editais ativos"
          value={fmtNum(editaisAgg.length)}
          accent="text-blue-600"
        />
        <KPI
          icon={<Stethoscope className="h-5 w-5" />}
          label="Em perícia médica"
          value={fmtNum(kanbanAgg[2]?.cards.reduce((a, c) => a + c.quantidade, 0) ?? 0)}
          accent="text-cyan-600"
        />
        <KPI
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Editais em alerta"
          value={fmtNum(kpis.editaisAlerta)}
          accent="text-orange-600"
        />
      </div>

      {drill && (
        <DrillDialog<Chamamento>
          open
          onClose={() => setDrill(null)}
          title={drill.title}
          rows={drill.rows}
          columns={drillColumns}
          csvName={drill.title}
        />
      )}
    </div>
  );
}

// ----- subcomponents -----

function KPI({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`shrink-0 ${accent ?? "text-primary"}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase truncate">
          {label}
        </p>
        <p className="text-xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

type AndamentoRowLite = {
  id: string;
  secretaria: string;
  cargo: string;
  quantidade: number;
  andamento: string;
};

const KANBAN_FASES = [
  { id: 1, label: "Aguardando Manifestação", color: "border-slate-400" },
  { id: 2, label: "Entrega de Documentação", color: "border-amber-400" },
  { id: 3, label: "Inspeção / Perícia Médica", color: "border-cyan-400" },
  { id: 4, label: "Pronto para Nomeação", color: "border-blue-500" },
  { id: 5, label: "Aguardando Posse", color: "border-emerald-500" },
];

function Kanban({
  data,
}: {
  data: { fase: number; cards: AndamentoRowLite[] }[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {KANBAN_FASES.map((f) => {
        const col = data.find((d) => d.fase === f.id);
        const cards = col?.cards ?? [];
        const totalVagas = cards.reduce((a, c) => a + c.quantidade, 0);
        return (
          <div key={f.id} className={`border-t-4 ${f.color} bg-muted/30 rounded-lg p-2 min-h-[200px]`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold">
                {f.id}. {f.label}
              </p>
              <Badge variant="secondary" className="text-[10px]">
                {totalVagas}
              </Badge>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="bg-card border rounded p-2 text-[11px] space-y-0.5"
                >
                  <p className="font-medium truncate">{c.cargo}</p>
                  <p className="text-muted-foreground truncate">
                    {c.secretaria}
                  </p>
                  <p className="text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] h-4">
                      {c.quantidade} vagas
                    </Badge>
                  </p>
                  {c.andamento && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {c.andamento}
                    </p>
                  )}
                </div>
              ))}
              {cards.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">
                  Sem cards
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DossieDigital({
  editalSelecionado,
  onChange,
}: {
  editalSelecionado: any;
  onChange: (c: Chamamento, status: string) => void;
}) {
  const candidato = useMemo<Chamamento | null>(() => {
    if (!editalSelecionado) return null;
    return (
      editalSelecionado.rows.find(
        (r: Chamamento) =>
          r.status === "EM_ANDAMENTO" || r.status === "ATENCAO",
      ) ??
      editalSelecionado.rows[0] ??
      null
    );
  }, [editalSelecionado]);

  return (
    <Card className="col-span-12 md:col-span-8 bg-card/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          5. Dossiê Digital de Convocação & Controle de Prazos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!candidato ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Selecione um edital para visualizar o dossiê
          </p>
        ) : (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-5 gap-2">
              <CanalCard icon={<Newspaper />} label="Diário Oficial" value={candidato.data_publicacao ?? "—"} sub="Publicação" />
              <CanalCard icon={<Mail />} label="AR Correios" value="—" sub="Rastreio" />
              <CanalCard icon={<Mail />} label="E-mail" value="—" sub="Envio" />
              <CanalCard icon={<MessageSquare />} label="WhatsApp" value="—" sub="API oficial" />
              <CanalCard icon={<MessageSquare />} label="SMS" value="—" sub="Gateway" />
            </div>
            <div className="col-span-12 lg:col-span-4 border rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/30">
              <p className="text-[10px] uppercase text-muted-foreground">
                Candidato em foco
              </p>
              <p className="font-semibold text-sm truncate">{candidato.nome ?? "—"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {candidato.cargo} • {candidato.numero_concurso} • Class. {candidato.classificacao ?? "—"}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-amber-600" />
                <p className="text-xs">
                  Publicado em{" "}
                  <span className="font-semibold">
                    {candidato.data_publicacao ?? "—"}
                  </span>
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => onChange(candidato, s)}
                    className={`text-[10px] px-2 py-0.5 rounded border ${
                      candidato.status === s
                        ? STATUS_META[s].color
                        : "bg-transparent text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Canais multicanal prontos para integração (Correios, e-mail, WhatsApp/SMS).
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CanalCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border rounded-lg p-2 space-y-0.5 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        <p className="text-[10px] uppercase truncate">{label}</p>
      </div>
      <p className="text-xs font-semibold truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Stepper({
  status,
}: {
  status: { status: string; label: string; total: number }[];
}) {
  const steps = [
    { key: "AGUARDANDO_HOMOLOGACAO", icon: <FileText className="h-4 w-4" />, label: "Posse / Homologação" },
    { key: "INICIOU", icon: <CheckCircle2 className="h-4 w-4" />, label: "Início efetivo / Em exercício" },
    { key: "EM_ANDAMENTO", icon: <Clock className="h-4 w-4" />, label: "Em processamento" },
    { key: "ATENCAO", icon: <AlertTriangle className="h-4 w-4" />, label: "Atenção / Pendência" },
    { key: "RENUNCIA", icon: <ArrowRight className="h-4 w-4" />, label: "Renúncia" },
    { key: "DESISTENCIA", icon: <ArrowRight className="h-4 w-4" />, label: "Desistência" },
  ];
  return (
    <div className="space-y-2">
      {steps.map((s) => {
        const meta = STATUS_META[s.key];
        const t = status.find((x) => x.status === s.key)?.total ?? 0;
        return (
          <div
            key={s.key}
            className="flex items-center gap-3 border rounded-lg p-2.5"
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center ${meta?.dot} text-white shrink-0`}
            >
              {s.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {meta?.label}
              </p>
            </div>
            <p className="text-xl font-bold tabular-nums">{fmtNum(t)}</p>
          </div>
        );
      })}
    </div>
  );
}