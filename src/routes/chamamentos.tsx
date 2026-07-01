import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrillDialog, type DrillColumn } from "@/components/charts/DrillDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  listChamamentos,
  getChamamentosKpis,
  listSecretariasChamamento,
  updateChamamentoStatus,
} from "@/lib/chamamentos.functions";
import {
  Users,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Timer,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chamamentos")({
  component: ChamamentosPage,
});

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  PENDENTE: { label: "Pendente", tone: "bg-slate-500" },
  EM_ANDAMENTO: { label: "Em andamento", tone: "bg-blue-500" },
  AGUARDANDO_HOMOLOGACAO: { label: "Aguardando homologação", tone: "bg-amber-500" },
  INICIOU: { label: "Iniciou", tone: "bg-emerald-600" },
  DESISTENCIA: { label: "Desistência", tone: "bg-rose-500" },
  RENUNCIA: { label: "Renúncia", tone: "bg-orange-500" },
  ATENCAO: { label: "Atenção", tone: "bg-yellow-500" },
};

function ChamamentosPage() {
  return (
    <LoginGate>
      <ChamamentosInner />
    </LoginGate>
  );
}

function ChamamentosInner() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [secretaria, setSecretaria] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [detail, setDetail] = useState<any>(null);
  const [drillStatus, setDrillStatus] = useState<string | null>(null);

  const filters = { page, pageSize: 50, q: q || null, secretaria: secretaria || null, tipo: tipo || null, status: status || null, motivo: motivo || null };

  const { data: kpis } = useQuery({ queryKey: ["cham_kpis"], queryFn: () => getChamamentosKpis() });
  const { data: secretarias = [] } = useQuery({
    queryKey: ["cham_secretarias"],
    queryFn: () => listSecretariasChamamento(),
  });
  const { data: page$ = { rows: [], count: 0 }, isFetching } = useQuery({
    queryKey: ["cham_list", filters],
    queryFn: () => listChamamentos({ data: filters }),
  });

  const totalPages = Math.max(1, Math.ceil(page$.count / 50));

  const kpiCards = useMemo(
    () => [
      { title: "Total geral", value: kpis?.total ?? 0, icon: <FileSpreadsheet />, tone: "", status: "__ALL__" },
      { title: "Pendentes", value: kpis?.pendentes ?? 0, icon: <Clock />, tone: "text-amber-600", status: "PENDENTE" },
      { title: "Em andamento", value: kpis?.andamento ?? 0, icon: <Timer />, tone: "text-blue-600", status: "EM_ANDAMENTO" },
      { title: "Aguardando homologação", value: kpis?.aguardando ?? 0, icon: <AlertTriangle />, tone: "text-amber-600", status: "AGUARDANDO_HOMOLOGACAO" },
      { title: "Iniciou / concluídos", value: kpis?.concluidos ?? 0, icon: <CheckCircle2 />, tone: "text-emerald-600", status: "INICIOU" },
      { title: "Desistências", value: kpis?.desistencia ?? 0, icon: <XCircle />, tone: "text-rose-600", status: "DESISTENCIA" },
      { title: "Renúncias", value: kpis?.renuncia ?? 0, icon: <XCircle />, tone: "text-orange-600", status: "RENUNCIA" },
      { title: "Tempo médio (dias)", value: kpis?.tempoMedioDias ?? 0, icon: <Timer />, tone: "", status: null },
      { title: "Concursos vigentes", value: kpis?.cpVigentes ?? 0, icon: <Building2 />, tone: "text-primary", status: null },
      { title: "Seletivos vigentes", value: kpis?.psVigentes ?? 0, icon: <Building2 />, tone: "", status: null },
    ],
    [kpis],
  );

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                Sistema Integrado de Chamamentos Públicos
              </h1>
              <p className="text-xs text-muted-foreground">
                Gestão de fila de convocação · CAB · v1.0
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/">
              <Button variant="ghost" size="sm">SGC</Button>
            </Link>
            <Link to="/levantamento">
              <Button variant="ghost" size="sm">Levantamento</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5">
          {kpiCards.map((k) => (
            <Card
              key={k.title}
              className={k.status ? "cursor-pointer transition hover:border-primary hover:shadow-md" : ""}
              onClick={() => k.status && setDrillStatus(k.status)}
            >
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {k.title}
                  </p>
                  <p className="text-lg font-semibold">{k.value}</p>
                </div>
                <div className={k.tone || "text-primary"}>{k.icon}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-64 pl-8"
                placeholder="Nome, prontuário, memo, responsável…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <Select value={secretaria || "_all"} onValueChange={(v) => { setSecretaria(v === "_all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Secretaria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas secretarias</SelectItem>
                {secretarias.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tipo || "_all"} onValueChange={(v) => { setTipo(v === "_all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos tipos</SelectItem>
                <SelectItem value="CP">Concurso Público</SelectItem>
                <SelectItem value="PS">Processo Seletivo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status || "_all"} onValueChange={(v) => { setStatus(v === "_all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Situação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas situações</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="w-48"
              placeholder="Motivo (ex: Exoneração)"
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setPage(0); }}
            />
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["cham_list"] })}>
              <RefreshCw className="mr-1 h-3 w-3" /> Atualizar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Chamamentos ({page$.count.toLocaleString()})
              </span>
              <span className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                        <TableHead>Candidato</TableHead>
                    <TableHead>Cargo</TableHead>
                        <TableHead>Secretaria</TableHead>
                        <TableHead>Motivo</TableHead>
                    <TableHead>Concurso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead>Publicação</TableHead>
                    <TableHead className="text-right">Class.</TableHead>
                    <TableHead>Prontuário</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page$.rows.map((r: any) => {
                    const st = STATUS_LABEL[r.status] ?? { label: r.status ?? "—", tone: "bg-slate-500" };
                    return (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                        <TableCell>
                          <Badge className={`${st.tone} text-white`}>{st.label}</Badge>
                        </TableCell>
                            <TableCell className="whitespace-nowrap font-medium">{r.nome ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.cargo}</TableCell>
                            <TableCell className="whitespace-nowrap">{r.secretaria}</TableCell>
                            <TableCell className="max-w-56 truncate text-xs">{r.motivo}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.numero_concurso ?? "—"}</TableCell>
                        <TableCell>{r.tipo_concurso ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.memo_os ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.data_publicacao ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.classificacao ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.prontuario ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.responsavel ?? "—"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetail(r); }}>
                            Abrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {page$.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-sm text-muted-foreground">
                        {isFetching ? "Carregando…" : "Nenhum chamamento encontrado."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="text-muted-foreground">
                Mostrando {page$.rows.length} · Total {page$.count.toLocaleString()}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Anterior
                </Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChamamentoDetailDialog
        row={detail}
        onClose={() => setDetail(null)}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["cham_list"] });
          qc.invalidateQueries({ queryKey: ["cham_kpis"] });
        }}
      />
      <KpiDrillDialog
        status={drillStatus}
        onClose={() => setDrillStatus(null)}
        onOpenDetail={(r) => { setDrillStatus(null); setDetail(r); }}
      />
    </div>
  );
}

function KpiDrillDialog({
  status,
  onClose,
  onOpenDetail,
}: {
  status: string | null;
  onClose: () => void;
  onOpenDetail: (r: any) => void;
}) {
  const isAll = status === "__ALL__";
  const { data } = useQuery({
    queryKey: ["cham_drill", status],
    queryFn: () =>
      listChamamentos({
        data: {
          page: 0,
          pageSize: 1000,
          status: isAll ? null : status,
        },
      }),
    enabled: !!status,
  });
  const rows = data?.rows ?? [];
  const cols: DrillColumn<any>[] = [
    { key: "nome", label: "Candidato", value: (r) => r.nome ?? "—" },
    { key: "cargo", label: "Cargo", value: (r) => r.cargo ?? "—" },
    { key: "secretaria", label: "Secretaria", value: (r) => r.secretaria ?? "—" },
    { key: "motivo", label: "Motivo", value: (r) => r.motivo ?? "—" },
    { key: "numero_concurso", label: "Concurso", value: (r) => `${r.tipo_concurso ?? ""} ${r.numero_concurso ?? "—"}` },
    { key: "data_publicacao", label: "Publicação", value: (r) => r.data_publicacao ?? "—" },
    { key: "classificacao", label: "Class.", value: (r) => r.classificacao ?? "—" },
    { key: "prontuario", label: "Prontuário", value: (r) => r.prontuario ?? "—" },
  ];
  const title = isAll
    ? "Todos os chamamentos"
    : `Chamamentos — ${STATUS_LABEL[status ?? ""]?.label ?? status ?? ""}`;
  return (
    <DrillDialog
      open={!!status}
      onClose={onClose}
      title={title}
      subtitle="Clique numa linha para abrir o detalhe do candidato"
      rows={rows}
      columns={cols}
      csvName={`chamamentos_${status ?? "todos"}`}
      onRowClick={onOpenDetail}
    />
  );
}

function ChamamentoDetailDialog({
  row,
  onClose,
  onChanged,
}: {
  row: any | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);
  if (!row) return null;
  const timeline = [
    { label: "Pedido", date: row.data_memo },
    { label: "Publicação", date: row.data_publicacao },
    { label: "Início / Posse", date: row.data_inicio },
  ].filter((t) => t.date);
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {row.cargo} · {row.numero_concurso ?? ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Info label="Candidato" value={row.nome} />
            <Info label="Classificação" value={row.classificacao} />
            <Info label="Prontuário" value={row.prontuario ?? "—"} />
            <Info label="Secretaria" value={row.secretaria} />
            <Info label="Tipo" value={row.tipo_concurso} />
            <Info label="Memo" value={row.memo_os} />
            <Info label="Motivo" value={row.motivo} />
            <Info label="Responsável" value={row.responsavel} />
            <Info label="Status atual" value={STATUS_LABEL[row.status]?.label ?? row.status} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Timeline</p>
            <div className="space-y-1.5">
              {timeline.length === 0 && <p className="text-xs text-muted-foreground">Sem datas registradas.</p>}
              {timeline.map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="w-32 text-muted-foreground">{t.label}</span>
                  <span>{t.date}</span>
                </div>
              ))}
            </div>
          </div>
          {row.observacao && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Observação</p>
              <p className="rounded border p-2 text-xs">{row.observacao}</p>
            </div>
          )}
          <div className="rounded border p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Atualizar situação
            </p>
            <div className="flex flex-wrap gap-2">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Novo status" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="flex-1 min-w-56"
                placeholder="Observação (opcional)"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
              <Button
                disabled={!newStatus || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await updateChamamentoStatus({
                      data: { id: row.id, status: newStatus, observacao: obs || null },
                    });
                    toast.success("Situação atualizada");
                    onChanged();
                    onClose();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Falha ao atualizar");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}