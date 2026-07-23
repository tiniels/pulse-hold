import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  listCertames,
  listImportacoes,
  listAuditoria,
  listHistorico,
  listSimulacoes,
  listVencimentos,
  previewImport,
  commitImport,
  rollbackImportacao,
  upsertCertame,
  arquivarCertame,
  saveSimulacao,
  type Certame,
} from "@/lib/levantamento.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
} from "recharts";
import {
  Upload,
  Download,
  FileSpreadsheet,
  History,
  Shield,
  FlaskConical,
  Building2,
  ArrowLeft,
  Search,
  Archive,
  Undo2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Layers,
  Coins,
  Home,
  BarChart3,
  Plus,
  Info,
} from "lucide-react";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getCertameCargosDetalhe,
  getFilaCargoDetalhe,
} from "@/lib/chamamentos.functions";
import { Users } from "lucide-react";

export const Route = createFileRoute("/levantamento")({
  head: () => ({
    meta: [
      {
        title:
          "Levantamento — Sistema Integrado de Planejamento de Certames e Gestão de Pessoal",
      },
      {
        name: "description",
        content:
          "Plataforma corporativa de planejamento de concursos públicos, processos seletivos e impacto de pessoal.",
      },
    ],
  }),
  component: LevantamentoPage,
});

function LevantamentoPage() {
  return (
    <LoginGate>
      <LevantamentoInner />
    </LoginGate>
  );
}

const COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#eab308",
];

const SITUACOES: Record<string, { label: string; color: string }> = {
  planejado: { label: "Planejado", color: "bg-slate-500" },
  em_andamento: { label: "Em andamento", color: "bg-blue-500" },
  vigente: { label: "Vigente", color: "bg-emerald-500" },
  proximo_vencimento: { label: "Próx. vencimento", color: "bg-amber-500" },
  encerrado: { label: "Encerrado", color: "bg-rose-500" },
  homologado: { label: "Homologado", color: "bg-teal-500" },
  prorrogado: { label: "Prorrogado", color: "bg-indigo-500" },
  cancelado: { label: "Cancelado", color: "bg-zinc-500" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function LevantamentoInner() {
  const qc = useQueryClient();
  const [drill, setDrill] = useState<null | {
    title: string;
    items: Certame[];
  }>(null);
  const [certameSel, setCertameSel] = useState<Certame | null>(null);
  const [cargoFilaSel, setCargoFilaSel] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const { data: certames = [] } = useQuery({
    queryKey: ["lev_certames"],
    queryFn: () => listCertames(),
  });
  const { data: importacoes = [] } = useQuery({
    queryKey: ["lev_importacoes"],
    queryFn: () => listImportacoes(),
  });
  const { data: auditoria = [] } = useQuery({
    queryKey: ["lev_auditoria"],
    queryFn: () => listAuditoria(),
  });
  const { data: historico = [] } = useQuery({
    queryKey: ["lev_historico"],
    queryFn: () => listHistorico({ data: {} }),
  });
  const { data: simulacoes = [] } = useQuery({
    queryKey: ["lev_simulacoes"],
    queryFn: () => listSimulacoes(),
  });
  const { data: vencimentos = [] } = useQuery({
    queryKey: ["lev_vencimentos"],
    queryFn: () => listVencimentos(),
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["lev_certames"] });
    qc.invalidateQueries({ queryKey: ["lev_importacoes"] });
    qc.invalidateQueries({ queryKey: ["lev_auditoria"] });
    qc.invalidateQueries({ queryKey: ["lev_historico"] });
  };

  const ultimaAtualizacao = useMemo(() => {
    const iso = importacoes[0]?.created_at ?? null;
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }, [importacoes]);

  // Custo médio por cargo (a partir de vencimentos existentes — MVP heurístico)
  const custoMedio = useMemo(() => {
    // vencimentos table doesn't have salary — use static heurística por tipo
    // fallback: R$ 4.500 base, 1.5x encargos
    return { salario: 4500, encargos: 1.5, custoMensal: 4500 * 1.5 };
  }, [vencimentos]);

  // KPIs
  const kpis = useMemo(() => {
    const ativos = certames.filter(
      (c) => !c.arquivado && c.situacao !== "encerrado" && c.situacao !== "cancelado",
    );
    const encerrados = certames.filter((c) => c.situacao === "encerrado");
    const vagas = certames.reduce((s, c) => s + (c.total_disponivel || 0), 0);
    const atendidas = certames.reduce((s, c) => s + (c.qtd_atendida || 0), 0);
    const aprovados = certames.reduce((s, c) => s + (c.qtd_aprovados || 0), 0);
    const pedidosAbertos = certames.reduce(
      (s, c) => s + (c.pedidos_abertos || 0),
      0,
    );
    const pedidosAndamento = certames.reduce(
      (s, c) => s + (c.pedidos_andamento || 0),
      0,
    );
    const desist = certames.reduce(
      (s, c) => s + (c.desistencias_renuncias || 0),
      0,
    );
    const proximoVenc = certames.filter(
      (c) => c.situacao === "proximo_vencimento",
    );
    const impactoAnual =
      vagas * custoMedio.custoMensal * 12;
    return {
      total: certames.length,
      ativos: ativos.length,
      encerrados: encerrados.length,
      vagas,
      atendidas,
      disponiveis: vagas - atendidas,
      aprovados,
      pedidosAbertos,
      pedidosAndamento,
      desist,
      proximoVenc: proximoVenc.length,
      impactoAnual,
      cp: certames.filter((c) => c.tipo === "CP").length,
      ps: certames.filter((c) => c.tipo === "PS").length,
    };
  }, [certames, custoMedio]);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                Visão Geral de Certames
              </h1>
              <p className="text-xs text-muted-foreground">
                Sistema Integrado de Planejamento · CAB
                {ultimaAtualizacao && (
                  <> · Última atualização: <span className="font-medium">{ultimaAtualizacao}</span></>
                )}
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button size="sm" onClick={() => setNovoOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Novo Certame
            </Button>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <Home className="mr-1 h-4 w-4" />
                SGC
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard CAB
              </Button>
            </Link>
            <Link to="/chamamentos">
              <Button variant="ghost" size="sm">
                <Users className="mr-1 h-4 w-4" />
                Chamamentos
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 p-4">
        {/* KPI CARDS */}
        <TooltipProvider delayDuration={200}>
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
          <Kpi
            title="Certames totais"
            value={kpis.total}
            icon={<Layers />}
            help="Todos os certames cadastrados (CP + PS), incluindo arquivados."
            onClick={() => setDrill({ title: "Certames totais", items: certames })}
          />
          <Kpi
            title="Ativos"
            value={kpis.ativos}
            icon={<CheckCircle2 />}
            tone="ok"
            help="Certames vigentes ou em andamento — não encerrados, não cancelados e não arquivados."
            onClick={() =>
              setDrill({
                title: "Certames ativos",
                items: certames.filter(
                  (c) =>
                    !c.arquivado &&
                    c.situacao !== "encerrado" &&
                    c.situacao !== "cancelado",
                ),
              })
            }
          />
          <Kpi
            title="Encerrados"
            value={kpis.encerrados}
            icon={<Archive />}
            help="Certames com situação = Encerrado."
            onClick={() =>
              setDrill({
                title: "Certames encerrados",
                items: certames.filter((c) => c.situacao === "encerrado"),
              })
            }
          />
          <Kpi
            title="Próx. vencimento"
            value={kpis.proximoVenc}
            icon={<AlertTriangle />}
            tone="warn"
            help="Certames marcados com situação 'próximo do vencimento'."
            onClick={() =>
              setDrill({
                title: "Próximos do vencimento",
                items: certames.filter((c) => c.situacao === "proximo_vencimento"),
              })
            }
          />
          <Kpi
            title="Vagas autorizadas"
            value={kpis.vagas}
            icon={<Building2 />}
            help="Soma de 'total_disponivel' de todos os certames."
            onClick={() =>
              setDrill({
                title: "Certames com vagas autorizadas",
                items: certames.filter((c) => (c.total_disponivel || 0) > 0),
              })
            }
          />
          <Kpi
            title="Impacto anual (est.)"
            value={fmtBRL(kpis.impactoAnual)}
            icon={<Coins />}
            tone="warn"
            help="Estimativa: vagas × salário médio × encargos × 12 meses."
          />
          <Kpi
            title="Aprovados"
            value={kpis.aprovados}
            icon={<TrendingUp />}
            help="Soma da coluna 'qtd_aprovados' em todos os certames."
            onClick={() =>
              setDrill({
                title: "Certames com aprovados",
                items: certames.filter((c) => (c.qtd_aprovados || 0) > 0),
              })
            }
          />
          <Kpi
            title="Atendidas"
            value={kpis.atendidas}
            icon={<CheckCircle2 />}
            tone="ok"
            help="Vagas já preenchidas por candidatos convocados."
            onClick={() =>
              setDrill({
                title: "Certames com vagas atendidas",
                items: certames.filter((c) => (c.qtd_atendida || 0) > 0),
              })
            }
          />
          <Kpi
            title="Vagas disponíveis"
            value={kpis.disponiveis}
            icon={<Building2 />}
            help="Vagas autorizadas menos as atendidas."
            onClick={() =>
              setDrill({
                title: "Certames com vagas disponíveis",
                items: certames.filter(
                  (c) => (c.total_disponivel || 0) - (c.qtd_atendida || 0) > 0,
                ),
              })
            }
          />
          <Kpi
            title="Pedidos abertos"
            value={kpis.pedidosAbertos}
            icon={<Clock />}
            help="Convocações formalmente pedidas mas ainda não iniciadas."
            onClick={() =>
              setDrill({
                title: "Certames com pedidos abertos",
                items: certames.filter((c) => (c.pedidos_abertos || 0) > 0),
              })
            }
          />
          <Kpi
            title="Em andamento"
            value={kpis.pedidosAndamento}
            icon={<Clock />}
            help="Convocações em processo de posse/nomeação."
            onClick={() =>
              setDrill({
                title: "Certames com pedidos em andamento",
                items: certames.filter((c) => (c.pedidos_andamento || 0) > 0),
              })
            }
          />
          <Kpi
            title="Desist./renúncia"
            value={kpis.desist}
            icon={<AlertTriangle />}
            tone="warn"
            help="Candidatos que desistiram ou renunciaram após convocação."
            onClick={() =>
              setDrill({
                title: "Certames com desistências/renúncias",
                items: certames.filter(
                  (c) => (c.desistencias_renuncias || 0) > 0,
                ),
              })
            }
          />
        </div>
        </TooltipProvider>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="dashboard">
              <BarChart3 className="mr-1 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="certames">
              <FileSpreadsheet className="mr-1 h-4 w-4" />
              Certames
            </TabsTrigger>
            <TabsTrigger value="importar">
              <Upload className="mr-1 h-4 w-4" />
              Importador
            </TabsTrigger>
            <TabsTrigger value="simulacao">
              <FlaskConical className="mr-1 h-4 w-4" />
              Simulação
            </TabsTrigger>
            <TabsTrigger value="historico">
              <History className="mr-1 h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="auditoria">
              <Shield className="mr-1 h-4 w-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardPanel certames={certames} custoMensal={custoMedio.custoMensal} />
          </TabsContent>
          <TabsContent value="certames">
            <CertamesPanel certames={certames} onChange={refetch} />
          </TabsContent>
          <TabsContent value="importar">
            <ImportadorPanel importacoes={importacoes} onDone={refetch} />
          </TabsContent>
          <TabsContent value="simulacao">
            <SimulacaoPanel
              certames={certames}
              simulacoes={simulacoes}
              custoMensal={custoMedio.custoMensal}
              onSaved={() =>
                qc.invalidateQueries({ queryKey: ["lev_simulacoes"] })
              }
            />
          </TabsContent>
          <TabsContent value="historico">
            <HistoricoPanel historico={historico} />
          </TabsContent>
          <TabsContent value="auditoria">
            <AuditoriaPanel auditoria={auditoria} />
          </TabsContent>
        </Tabs>
      </div>

      <CertamesDrillDialog
        drill={drill}
        onClose={() => setDrill(null)}
        onSelectCertame={(c) => setCertameSel(c)}
      />
      <CertameCargosDialog
        certame={certameSel}
        onClose={() => setCertameSel(null)}
        onSelectCargo={(id) => setCargoFilaSel(id)}
      />
      <FilaCargoDialog
        cargoFilaId={cargoFilaSel}
        onClose={() => setCargoFilaSel(null)}
      />

      {novoOpen && (
        <EditDialog
          certame={{
            id: "",
            tipo: "CP",
            cargo: "",
            numero: null,
            ano: new Date().getFullYear(),
            secretaria: null,
            orgao: null,
            homologacao_status: null,
            prova_pratica: null,
            qtd_aprovados: 0,
            data_homologacao: null,
            vencimento: null,
            prorrogacao: null,
            total_disponivel: 0,
            regularizar: null,
            pedidos_abertos: 0,
            pedidos_andamento: 0,
            memo: null,
            qtd_atendida: 0,
            desistencias_renuncias: 0,
            situacao: "planejado",
            observacoes: null,
            arquivado: false,
            importacao_id: null,
            row_hash: null,
            created_at: "",
            updated_at: "",
          }}
          onClose={() => setNovoOpen(false)}
          onSaved={() => {
            setNovoOpen(false);
            refetch();
            setTab("certames");
          }}
        />
      )}
    </div>
  );
}

function Kpi({
  title,
  value,
  icon,
  tone,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "ok" | "warn";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-primary";
  return (
    <Card
      onClick={onClick}
      className={onClick ? "cursor-pointer transition hover:shadow-md" : ""}
    >
      <CardContent className="flex items-center justify-between p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
        <div className={toneClass}>{icon}</div>
      </CardContent>
    </Card>
  );
}

// ============ DASHBOARD ============
function DashboardPanel({
  certames,
  custoMensal,
}: {
  certames: Certame[];
  custoMensal: number;
}) {
  const porTipo = useMemo(
    () => [
      { name: "CP", value: certames.filter((c) => c.tipo === "CP").length },
      { name: "PS", value: certames.filter((c) => c.tipo === "PS").length },
    ],
    [certames],
  );
  const porSituacao = useMemo(() => {
    const m = new Map<string, number>();
    certames.forEach((c) => m.set(c.situacao, (m.get(c.situacao) ?? 0) + 1));
    return Array.from(m, ([name, value]) => ({
      name: SITUACOES[name]?.label ?? name,
      value,
    }));
  }, [certames]);
  const porAno = useMemo(() => {
    const m = new Map<number, { ano: number; cp: number; ps: number; vagas: number }>();
    certames.forEach((c) => {
      if (!c.ano) return;
      const cur = m.get(c.ano) ?? { ano: c.ano, cp: 0, ps: 0, vagas: 0 };
      if (c.tipo === "CP") cur.cp++;
      else cur.ps++;
      cur.vagas += c.total_disponivel || 0;
      m.set(c.ano, cur);
    });
    return Array.from(m.values()).sort((a, b) => a.ano - b.ano);
  }, [certames]);
  const topCargos = useMemo(() => {
    const m = new Map<string, number>();
    certames.forEach((c) =>
      m.set(c.cargo, (m.get(c.cargo) ?? 0) + (c.total_disponivel || 0)),
    );
    return Array.from(m, ([cargo, vagas]) => ({ cargo, vagas }))
      .sort((a, b) => b.vagas - a.vagas)
      .slice(0, 12);
  }, [certames]);
  const proximosVenc = useMemo(
    () =>
      certames
        .filter((c) => c.vencimento)
        .sort((a, b) => (a.vencimento! < b.vencimento! ? -1 : 1))
        .slice(0, 10),
    [certames],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Certames por tipo</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={porTipo}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  innerRadius={40}
                  label
                >
                  {porTipo.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição por situação</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={porSituacao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <RTooltip />
                <Bar dataKey="value" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Evolução anual (CP × PS × vagas)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <AreaChart data={porAno}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ano" />
              <YAxis />
              <RTooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="cp"
                stroke="#0ea5e9"
                fill="#0ea5e9"
                fillOpacity={0.3}
                name="Concursos"
              />
              <Area
                type="monotone"
                dataKey="ps"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
                name="Proc. Seletivos"
              />
              <Line
                type="monotone"
                dataKey="vagas"
                stroke="#ef4444"
                strokeWidth={2}
                name="Vagas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 12 cargos por vagas</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer>
              <BarChart data={topCargos} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="cargo"
                  tick={{ fontSize: 10 }}
                  width={140}
                />
                <RTooltip />
                <Bar dataKey="vagas" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Próximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Venc.</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proximosVenc.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{c.cargo}</TableCell>
                      <TableCell className="text-xs">{c.numero ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {fmtDate(c.vencimento)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${SITUACOES[c.situacao]?.color ?? "bg-slate-500"} text-white`}
                        >
                          {SITUACOES[c.situacao]?.label ?? c.situacao}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Impacto financeiro estimado (mensal · anual)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Base de cálculo: R$ {custoMensal.toLocaleString("pt-BR")} por vaga
            (salário médio × encargos). Ajuste em Simulação para explorar cenários.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Mensal (todas as vagas)</p>
              <p className="text-xl font-semibold">
                {fmtBRL(
                  certames.reduce((s, c) => s + (c.total_disponivel || 0), 0) *
                    custoMensal,
                )}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Anual</p>
              <p className="text-xl font-semibold">
                {fmtBRL(
                  certames.reduce((s, c) => s + (c.total_disponivel || 0), 0) *
                    custoMensal *
                    12,
                )}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Já atendidas (mensal)</p>
              <p className="text-xl font-semibold">
                {fmtBRL(
                  certames.reduce((s, c) => s + (c.qtd_atendida || 0), 0) *
                    custoMensal,
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ CERTAMES ============
function CertamesPanel({
  certames,
  onChange,
}: {
  certames: Certame[];
  onChange: () => void;
}) {
  const [q, setQ] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [sitFilter, setSitFilter] = useState<string>("todos");
  const [editing, setEditing] = useState<Certame | null>(null);

  const filtered = useMemo(() => {
    return certames.filter((c) => {
      if (tipoFilter !== "todos" && c.tipo !== tipoFilter) return false;
      if (sitFilter !== "todos" && c.situacao !== sitFilter) return false;
      if (
        q &&
        !`${c.cargo} ${c.numero ?? ""} ${c.memo ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
  }, [certames, q, tipoFilter, sitFilter]);

  const exportCSV = () => {
    const cols = [
      "tipo",
      "cargo",
      "numero",
      "ano",
      "homologacao_status",
      "data_homologacao",
      "vencimento",
      "prorrogacao",
      "qtd_aprovados",
      "total_disponivel",
      "qtd_atendida",
      "desistencias_renuncias",
      "memo",
      "situacao",
    ];
    const csv = [
      cols.join(","),
      ...filtered.map((c) =>
        cols
          .map((k) => {
            const v = (c as unknown as Record<string, unknown>)[k];
            return `"${(v ?? "").toString().replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `certames_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm">
            {filtered.length} de {certames.length} certames
          </CardTitle>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-7 text-xs"
                placeholder="Buscar cargo, número, memo…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="CP">Concurso Público</SelectItem>
                <SelectItem value="PS">Proc. Seletivo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sitFilter} onValueChange={setSitFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as situações</SelectItem>
                {Object.entries(SITUACOES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="mr-1 h-3 w-3" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Cargo</TableHead>
                <TableHead className="text-xs">Nº</TableHead>
                <TableHead className="text-xs">Homologação</TableHead>
                <TableHead className="text-xs">Venc.</TableHead>
                <TableHead className="text-xs">Prorrog.</TableHead>
                <TableHead className="text-xs text-right">Aprov.</TableHead>
                <TableHead className="text-xs text-right">Disp.</TableHead>
                <TableHead className="text-xs text-right">Atend.</TableHead>
                <TableHead className="text-xs">Situação</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className={c.arquivado ? "opacity-50" : ""}>
                  <TableCell>
                    <Badge variant="outline">{c.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{c.cargo}</TableCell>
                  <TableCell className="text-xs">{c.numero ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {fmtDate(c.data_homologacao)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {fmtDate(c.vencimento)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {fmtDate(c.prorrogacao)}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {c.qtd_aprovados}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {c.total_disponivel}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {c.qtd_atendida}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${SITUACOES[c.situacao]?.color ?? "bg-slate-500"} text-white`}
                    >
                      {SITUACOES[c.situacao]?.label ?? c.situacao}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(c)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await arquivarCertame({
                            data: { id: c.id, arquivado: !c.arquivado },
                          });
                          onChange();
                        }}
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {editing && (
        <EditDialog
          certame={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange();
          }}
        />
      )}
    </Card>
  );
}

function EditDialog({
  certame,
  onClose,
  onSaved,
}: {
  certame: Certame;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Certame>>({ ...certame });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await upsertCertame({
        data: { id: certame.id, patch: form },
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Editar certame — {certame.tipo} · {certame.cargo}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Cargo">
            <Input
              value={form.cargo ?? ""}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
            />
          </Field>
          <Field label="Nº do edital">
            <Input
              value={form.numero ?? ""}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
            />
          </Field>
          <Field label="Data homologação">
            <Input
              type="date"
              value={form.data_homologacao ?? ""}
              onChange={(e) =>
                setForm({ ...form, data_homologacao: e.target.value })
              }
            />
          </Field>
          <Field label="Vencimento">
            <Input
              type="date"
              value={form.vencimento ?? ""}
              onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
            />
          </Field>
          <Field label="Prorrogação">
            <Input
              type="date"
              value={form.prorrogacao ?? ""}
              onChange={(e) => setForm({ ...form, prorrogacao: e.target.value })}
            />
          </Field>
          <Field label="Situação">
            <Select
              value={form.situacao}
              onValueChange={(v) => setForm({ ...form, situacao: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SITUACOES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Qtd. aprovados">
            <Input
              type="number"
              value={form.qtd_aprovados ?? 0}
              onChange={(e) =>
                setForm({ ...form, qtd_aprovados: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Total disponível">
            <Input
              type="number"
              value={form.total_disponivel ?? 0}
              onChange={(e) =>
                setForm({ ...form, total_disponivel: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Qtd. atendida">
            <Input
              type="number"
              value={form.qtd_atendida ?? 0}
              onChange={(e) =>
                setForm({ ...form, qtd_atendida: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Desistências/renúncias">
            <Input
              type="number"
              value={form.desistencias_renuncias ?? 0}
              onChange={(e) =>
                setForm({
                  ...form,
                  desistencias_renuncias: Number(e.target.value),
                })
              }
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Observações">
              <Textarea
                value={form.observacoes ?? ""}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
              />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            <Save className="mr-1 h-4 w-4" /> Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

// ============ IMPORTADOR ============
function ImportadorPanel({
  importacoes,
  onDone,
}: {
  importacoes: Array<{
    id: string;
    arquivo_nome: string;
    versao: number;
    status: string;
    novos: number;
    alterados: number;
    removidos: number;
    inalterados: number;
    created_at: string;
  }>;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    arquivo_nome: string;
    rows: Array<Partial<Certame>>;
    diff: {
      novos: unknown[];
      alterados: unknown[];
      removidos: unknown[];
      inalterados: unknown[];
    };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [removerAusentes, setRemoverAusentes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const rows: Array<Partial<Certame>> = [];
      const parseSheet = (name: string, tipo: "CP" | "PS") => {
        const ws = wb.Sheets[name];
        if (!ws) return;
        const data: unknown[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          dateNF: "yyyy-mm-dd",
        });
        const start = data.findIndex(
          (r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() === "CARGO"),
        );
        for (let i = start + 1; i < data.length; i++) {
          const r = data[i] as unknown[];
          const cargo = String(r[0] ?? "").trim();
          if (!cargo) continue;
          const numero = r[1] ? String(r[1]).trim() : null;
          const anoM = numero?.match(/(20\d{2})/);
          const parseDate = (v: unknown): string | null => {
            if (!v) return null;
            const s = String(v);
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
            const d = new Date(s);
            return isNaN(d.getTime())
              ? null
              : d.toISOString().slice(0, 10);
          };
          const intv = (v: unknown) => {
            const n = Number(v);
            return isNaN(n) ? 0 : Math.trunc(n);
          };
          const base: Partial<Certame> =
            tipo === "CP"
              ? {
                  tipo,
                  cargo,
                  numero,
                  ano: anoM ? Number(anoM[1]) : null,
                  homologacao_status: r[2] ? String(r[2]) : null,
                  prova_pratica: r[3] ? String(r[3]) : null,
                  qtd_aprovados: intv(r[4]),
                  data_homologacao: parseDate(r[5]),
                  vencimento: parseDate(r[6]),
                  prorrogacao: parseDate(r[7]),
                  total_disponivel: intv(r[8]),
                  regularizar: r[9] ? String(r[9]) : null,
                  pedidos_abertos: intv(r[10]),
                  pedidos_andamento: intv(r[11]),
                  memo: r[12] ? String(r[12]) : null,
                  qtd_atendida: intv(r[13]),
                  desistencias_renuncias: intv(r[14]),
                }
              : {
                  tipo,
                  cargo,
                  numero,
                  ano: anoM ? Number(anoM[1]) : null,
                  homologacao_status: r[2] ? String(r[2]) : null,
                  qtd_aprovados: intv(r[3]),
                  data_homologacao: parseDate(r[4]),
                  vencimento: parseDate(r[5]),
                  prorrogacao: parseDate(r[6]),
                  total_disponivel: intv(r[7]),
                  pedidos_abertos: intv(r[8]),
                  pedidos_andamento: intv(r[9]),
                  memo: r[10] ? String(r[10]) : null,
                  qtd_atendida: intv(r[11]),
                  desistencias_renuncias: intv(r[12]),
                };
          // hash
          const parts = [
            base.tipo,
            base.cargo,
            base.numero,
            base.data_homologacao,
            base.vencimento,
            base.total_disponivel,
            base.qtd_aprovados,
            base.qtd_atendida,
          ]
            .map((v) => String(v ?? ""))
            .join("|");
          let h = 0;
          for (let j = 0; j < parts.length; j++) {
            h = (h * 31 + parts.charCodeAt(j)) | 0;
          }
          base.row_hash = h.toString(16);
          rows.push(base);
        }
      };
      parseSheet("Concurso", "CP");
      parseSheet("Processo Seletivo", "PS");

      if (rows.length === 0) {
        throw new Error(
          "Nenhuma linha reconhecida. Verifique se o arquivo contém as abas 'Concurso' e 'Processo Seletivo'.",
        );
      }
      const diff = await previewImport({
        data: { arquivo_nome: file.name, rows },
      });
      setPreview({ arquivo_nome: file.name, rows, diff });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao processar arquivo.");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await commitImport({
        data: {
          arquivo_nome: preview.arquivo_nome,
          rows: preview.rows,
          remover_ausentes: removerAusentes,
        },
      });
      setPreview(null);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Importar planilha (.xlsx) — abas: Concurso, Processo Seletivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
              dragOver ? "border-primary bg-primary/5" : "border-muted"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) parseFile(f);
            }}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Arraste um Excel aqui ou clique para selecionar
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              O sistema detecta automaticamente as abas, compara com a base atual
              e mostra novos/alterados/removidos antes de gravar.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) parseFile(f);
              }}
            />
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? "Processando…" : "Selecionar arquivo"}
            </Button>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {preview && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    Pré-visualização — {preview.arquivo_nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {preview.rows.length} linhas lidas
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreview(null)}
                  >
                    Descartar
                  </Button>
                  <Button size="sm" onClick={commit} disabled={busy}>
                    Confirmar gravação
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <DiffBox
                  label="Novos"
                  count={preview.diff.novos.length}
                  color="bg-emerald-500"
                />
                <DiffBox
                  label="Alterados"
                  count={preview.diff.alterados.length}
                  color="bg-amber-500"
                />
                <DiffBox
                  label="Inalterados"
                  count={preview.diff.inalterados.length}
                  color="bg-slate-400"
                />
                <DiffBox
                  label="Ausentes (a arquivar)"
                  count={preview.diff.removidos.length}
                  color="bg-rose-500"
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={removerAusentes}
                  onChange={(e) => setRemoverAusentes(e.target.checked)}
                />
                Arquivar automaticamente registros que não estão mais na planilha
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico de importações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Novos</TableHead>
                <TableHead>Alterados</TableHead>
                <TableHead>Removidos</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importacoes.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs">{i.arquivo_nome}</TableCell>
                  <TableCell className="text-xs">v{i.versao}</TableCell>
                  <TableCell className="text-xs">{i.novos}</TableCell>
                  <TableCell className="text-xs">{i.alterados}</TableCell>
                  <TableCell className="text-xs">{i.removidos}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(i.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={i.status === "rollback" ? "destructive" : "outline"}
                    >
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {i.status === "commit" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Reverter todas as alterações desta importação?",
                            )
                          )
                            return;
                          await rollbackImportacao({
                            data: { importacao_id: i.id },
                          });
                          onDone();
                        }}
                      >
                        <Undo2 className="mr-1 h-3 w-3" /> Rollback
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DiffBox({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`rounded-md ${color} p-3 text-white`}>
      <p className="text-[10px] uppercase opacity-80">{label}</p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
}

// ============ SIMULACAO ============
function SimulacaoPanel({
  certames,
  simulacoes,
  custoMensal,
  onSaved,
}: {
  certames: Certame[];
  simulacoes: Array<{ id: string; nome: string; created_at: string; cenario: unknown; resultado: unknown }>;
  custoMensal: number;
  onSaved: () => void;
}) {
  const [novasVagas, setNovasVagas] = useState(50);
  const [aposentadorias, setAposentadorias] = useState(20);
  const [exoneracoes, setExoneracoes] = useState(10);
  const [salarioMedio, setSalarioMedio] = useState(4500);
  const [encargos, setEncargos] = useState(1.5);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const vagasAtuais = certames.reduce(
    (s, c) => s + (c.total_disponivel || 0),
    0,
  );
  const resultado = useMemo(() => {
    const custoUnit = salarioMedio * encargos;
    const vagasProjetadas =
      vagasAtuais + novasVagas - aposentadorias - exoneracoes;
    return {
      custoUnit,
      vagasProjetadas,
      impactoMensal: vagasProjetadas * custoUnit,
      impactoAnual: vagasProjetadas * custoUnit * 12,
      impactoNovas: novasVagas * custoUnit * 12,
      economia: (aposentadorias + exoneracoes) * custoUnit * 12,
    };
  }, [novasVagas, aposentadorias, exoneracoes, salarioMedio, encargos, vagasAtuais]);

  const salvar = async () => {
    if (!nome) return;
    await saveSimulacao({
      data: {
        nome,
        descricao,
        cenario: {
          novasVagas,
          aposentadorias,
          exoneracoes,
          salarioMedio,
          encargos,
        },
        resultado,
      },
    });
    setNome("");
    setDescricao("");
    onSaved();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <FlaskConical className="mr-1 inline h-4 w-4" />
            Sandbox de cenários
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Simulações jamais alteram dados oficiais.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label={`Novas vagas planejadas: ${novasVagas}`}>
            <Input
              type="range"
              min={0}
              max={500}
              value={novasVagas}
              onChange={(e) => setNovasVagas(Number(e.target.value))}
            />
          </Field>
          <Field label={`Aposentadorias esperadas: ${aposentadorias}`}>
            <Input
              type="range"
              min={0}
              max={200}
              value={aposentadorias}
              onChange={(e) => setAposentadorias(Number(e.target.value))}
            />
          </Field>
          <Field label={`Exonerações estimadas: ${exoneracoes}`}>
            <Input
              type="range"
              min={0}
              max={200}
              value={exoneracoes}
              onChange={(e) => setExoneracoes(Number(e.target.value))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Salário médio">
              <Input
                type="number"
                value={salarioMedio}
                onChange={(e) => setSalarioMedio(Number(e.target.value))}
              />
            </Field>
            <Field label="Multiplicador encargos">
              <Input
                type="number"
                step="0.1"
                value={encargos}
                onChange={(e) => setEncargos(Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="grid gap-2 border-t pt-3">
            <Field label="Nome da simulação">
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Cenário expansão SMS 2027"
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </Field>
            <Button onClick={salvar} disabled={!nome}>
              <Save className="mr-1 h-4 w-4" /> Salvar cenário
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <Box label="Vagas atuais" value={vagasAtuais.toString()} />
            <Box label="Vagas projetadas" value={resultado.vagasProjetadas.toString()} />
            <Box label="Custo unit./mês" value={fmtBRL(resultado.custoUnit)} />
            <Box label="Impacto mensal" value={fmtBRL(resultado.impactoMensal)} tone="warn" />
            <Box label="Impacto anual" value={fmtBRL(resultado.impactoAnual)} tone="warn" />
            <Box
              label="Impacto novas (anual)"
              value={fmtBRL(resultado.impactoNovas)}
            />
            <Box
              label="Economia projetada"
              value={fmtBRL(resultado.economia)}
              tone="ok"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cenários salvos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulacoes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.nome}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(s.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {simulacoes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-xs text-muted-foreground">
                        Nenhum cenário salvo ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Box({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
      : tone === "warn"
        ? "border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-400"
        : "border-muted";
  return (
    <div className={`rounded-md border p-2 ${cls}`}>
      <p className="text-[10px] uppercase opacity-80">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

// ============ HISTORICO ============
function HistoricoPanel({
  historico,
}: {
  historico: Array<{
    id: string;
    certame_id: string | null;
    versao: number;
    snapshot: unknown;
    motivo: string | null;
    created_at: string;
  }>;
}) {
  const [open, setOpen] = useState<unknown | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Versionamento completo por certame ({historico.length} snapshots)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cada alteração ou importação preserva uma versão anterior para
          consulta e rollback.
        </p>
      </CardHeader>
      <CardContent>
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Certame ID</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Snapshot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs">
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-mono text-[10px]">
                    {h.certame_id?.slice(0, 8) ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline">{h.motivo ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setOpen(h.snapshot)}
                    >
                      ver JSON
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {open !== null && (
        <Dialog open onOpenChange={() => setOpen(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Snapshot</DialogTitle>
            </DialogHeader>
            <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-[11px]">
              {JSON.stringify(open, null, 2)}
            </pre>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// ============ AUDITORIA ============
function AuditoriaPanel({
  auditoria,
}: {
  auditoria: Array<{
    id: string;
    usuario_email: string | null;
    acao: string;
    entidade: string;
    entidade_id: string | null;
    created_at: string;
    valores_antigos: unknown;
    valores_novos: unknown;
  }>;
}) {
  const [detail, setDetail] = useState<
    { antigos: unknown; novos: unknown } | null
  >(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Trilha de auditoria ({auditoria.length} eventos)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditoria.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">
                    {new Date(a.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.usuario_email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.acao}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{a.entidade}</TableCell>
                  <TableCell className="font-mono text-[10px]">
                    {a.entidade_id?.slice(0, 8) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() =>
                        setDetail({
                          antigos: a.valores_antigos,
                          novos: a.valores_novos,
                        })
                      }
                    >
                      diff
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {detail && (
        <Dialog open onOpenChange={() => setDetail(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Diff de valores</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-rose-600">
                  Antigos
                </p>
                <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-[11px]">
                  {JSON.stringify(detail.antigos, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-emerald-600">
                  Novos
                </p>
                <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-[11px]">
                  {JSON.stringify(detail.novos, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// ============================================================
// Drill-down: Certames -> Cargos -> Fila
// ============================================================

function CertamesDrillDialog({
  drill,
  onClose,
  onSelectCertame,
}: {
  drill: { title: string; items: Certame[] } | null;
  onClose: () => void;
  onSelectCertame: (c: Certame) => void;
}) {
  const [q, setQ] = useState("");
  if (!drill) return null;
  const filtered = drill.items.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (c.cargo ?? "").toLowerCase().includes(s) ||
      (c.numero ?? "").toLowerCase().includes(s) ||
      (c.secretaria ?? "").toLowerCase().includes(s)
    );
  });
  return (
    <Dialog open={!!drill} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {drill.title} · {drill.items.length}
          </DialogTitle>
        </DialogHeader>
        <div className="mb-2">
          <Input
            placeholder="Filtrar por cargo, número ou secretaria…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Secretaria</TableHead>
                <TableHead className="text-right">Aprov.</TableHead>
                <TableHead className="text-right">Disp.</TableHead>
                <TableHead className="text-right">Atend.</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Vencimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => onSelectCertame(c)}
                >
                  <TableCell>{c.tipo}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.numero}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.cargo}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.secretaria ?? "—"}</TableCell>
                  <TableCell className="text-right">{c.qtd_aprovados ?? 0}</TableCell>
                  <TableCell className="text-right">{c.total_disponivel ?? 0}</TableCell>
                  <TableCell className="text-right">{c.qtd_atendida ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {SITUACOES[c.situacao ?? ""]?.label ?? c.situacao ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {fmtDate(c.vencimento)}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                    Nada encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CertameCargosDialog({
  certame,
  onClose,
  onSelectCargo,
}: {
  certame: Certame | null;
  onClose: () => void;
  onSelectCargo: (cargoFilaId: string) => void;
}) {
  const enabled = !!certame;
  const { data, isLoading } = useQuery({
    queryKey: ["certame_cargos", certame?.tipo, certame?.numero],
    queryFn: () =>
      getCertameCargosDetalhe({
        data: { tipo: certame!.tipo, numero: certame!.numero ?? undefined },
      }),
    enabled,
  });
  if (!certame) return null;
  const c = data?.concurso;
  return (
    <Dialog open={!!certame} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {certame.tipo} {certame.numero} · {certame.cargo}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {c && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 rounded border p-3 text-xs">
              <div><span className="text-muted-foreground">Realização:</span> {fmtDate(c.data_realizacao)}</div>
              <div><span className="text-muted-foreground">Homologação:</span> {fmtDate(c.data_homologacao)}</div>
              <div><span className="text-muted-foreground">Vencimento:</span> {fmtDate(c.data_vencimento)}</div>
              <div><span className="text-muted-foreground">Prorrogado até:</span> {fmtDate(c.prorrogado_ate)}</div>
            </div>
          )}
          {!c && !isLoading && (
            <p className="rounded border border-amber-500/50 bg-amber-500/10 p-2 text-xs">
              Este certame do levantamento ainda não possui base de fila importada em <b>concursos</b>.
              Ao importar as planilhas de concursos correspondentes, a fila detalhada aparecerá aqui.
            </p>
          )}
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Aprov.</TableHead>
                  <TableHead className="text-right">Disponíveis</TableHead>
                  <TableHead className="text-right">Convocados</TableHead>
                  <TableHead className="text-right">Salário ref.</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.cargos ?? []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.nome_original}</TableCell>
                    <TableCell className="text-right">{c.stats.total}</TableCell>
                    <TableCell className="text-right">{c.stats.disponiveis}</TableCell>
                    <TableCell className="text-right">{c.stats.convocados}</TableCell>
                    <TableCell className="text-right">
                      {c.salario_ref ? fmtBRL(c.salario_ref) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => onSelectCargo(c.id)}>
                        Ver fila
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {isLoading && (
                  <TableRow><TableCell colSpan={6}>Carregando…</TableCell></TableRow>
                )}
                {!isLoading && (data?.cargos?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                      Sem cargos ligados a este certame ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilaCargoDialog({
  cargoFilaId,
  onClose,
}: {
  cargoFilaId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["fila_cargo", cargoFilaId],
    queryFn: () => getFilaCargoDetalhe({ data: { cargoFilaId: cargoFilaId! } }),
    enabled: !!cargoFilaId,
  });
  if (!cargoFilaId) return null;
  const cargo = data?.cargo as any;
  return (
    <Dialog open={!!cargoFilaId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            Fila de convocação · {cargo?.nome_original ?? "…"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto text-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Lista</TableHead>
                <TableHead>Status fila</TableHead>
                <TableHead>Já foi chamado?</TableHead>
                <TableHead>Prontuário</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Secretaria</TableHead>
                <TableHead className="text-right">Nota</TableHead>
                <TableHead className="text-right">Salário ref.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.candidatos ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-right font-mono">{c.classificacao ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.nome}</TableCell>
                  <TableCell>{c.lista_tipo ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.status ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    {c.ja_chamado ? (
                      <Badge className="bg-emerald-600 text-white">
                        Sim · {c.chamamentos.length}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {c.prontuario ? (
                      <Badge className="bg-primary text-white">{c.prontuario}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{c.prontuario_vinculo ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.prontuario_secretaria ?? "—"}</TableCell>
                  <TableCell className="text-right">{c.nota ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {c.salario_ref ? fmtBRL(c.salario_ref) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {isLoading && (
                <TableRow><TableCell colSpan={10}>Carregando…</TableCell></TableRow>
              )}
              {!isLoading && (data?.candidatos?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-xs text-muted-foreground">
                    Nenhum candidato na fila deste cargo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}