import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCargos, createCargo, updateCargo, deleteCargo, toggleCargoAtivo, duplicateCargo,
  listDim, type CargoCanonico, type CargoInput, type CanonicalDim,
} from "@/lib/canonical.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, Pencil, Copy, Trash2, Power, Briefcase, Clock, Wallet,
  GraduationCap, Gift, Star, X, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const cargosQO = queryOptions({
  queryKey: ["mdm", "cargos"] as const,
  queryFn: async (): Promise<CargoCanonico[]> => (await listCargos()) as CargoCanonico[],
});
const vinculosQO = queryOptions({
  queryKey: ["mdm", "dim", "vinculo"],
  queryFn: () => listDim({ data: { tipo: "vinculo" } }),
});
const gruposQO = queryOptions({
  queryKey: ["mdm", "dim", "cargo"],
  queryFn: () => listDim({ data: { tipo: "cargo" } }),
});

function formatBRL(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function vinculoBadgeClass(nome: string | null) {
  const n = (nome ?? "").toUpperCase();
  if (n.includes("COMISS")) return "bg-purple-100 text-purple-700 border-purple-200";
  if (n.includes("ESTATU")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (n.includes("CLT")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function CargosPanel() {
  const qc = useQueryClient();
  const { data: cargos } = useSuspenseQuery(cargosQO);
  const { data: vinculos } = useSuspenseQuery(vinculosQO);
  const { data: grupos } = useSuspenseQuery(gruposQO);

  const [busca, setBusca] = useState("");
  const [vincFilter, setVincFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CargoCanonico | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cargos.filter((c) => {
      if (statusFilter === "ativos" && !c.ativo) return false;
      if (statusFilter === "inativos" && c.ativo) return false;
      if (vincFilter !== "all" && c.vinculo_id !== vincFilter) return false;
      if (q && !c.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cargos, busca, vincFilter, statusFilter]);

  const selected = useMemo(
    () => cargos.find((c) => c.id === selectedId) ?? null,
    [cargos, selectedId],
  );

  const toggleFn = useServerFn(toggleCargoAtivo);
  const dupFn = useServerFn(duplicateCargo);
  const delFn = useServerFn(deleteCargo);

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; ativo: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mdm", "cargos"] }),
  });
  const dupMut = useMutation({
    mutationFn: (id: string) => dupFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mdm", "cargos"] });
      toast.success("Cargo duplicado");
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mdm", "cargos"] });
      setSelectedId(null);
      toast.success("Cargo excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Cargos</CardTitle>
              <p className="text-xs text-muted-foreground">Dimensão canônica de cargos e vínculos.</p>
            </div>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-4 w-4" /> Novo Cargo
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cargo…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={vincFilter} onValueChange={setVincFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vínculos</SelectItem>
                {(vinculos as CanonicalDim[]).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Status: Ativos</SelectItem>
                <SelectItem value="inativos">Status: Inativos</SelectItem>
                <SelectItem value="todos">Status: Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead className="text-right">Salário Base</TableHead>
                  <TableHead className="text-right">Salário Real</TableHead>
                  <TableHead>Jornada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer ${selectedId === c.id ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={vinculoBadgeClass(c.vinculo_nome)}>
                        {c.vinculo_nome ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(c.salario_base)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(c.salario_real_esperado)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.jornada ?? "—"}</TableCell>
                    <TableCell>
                      {c.ativo
                        ? <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">Ativo</Badge>
                        : <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum cargo encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Exibindo {filtered.length} de {cargos.length} cargos
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <CargoDetailPanel
          cargo={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditing(selected)}
          onDuplicate={() => dupMut.mutate(selected.id)}
          onToggle={() => toggleMut.mutate({ id: selected.id, ativo: !selected.ativo })}
          onDelete={() => {
            if (confirm(`Excluir "${selected.nome}"?`)) delMut.mutate(selected.id);
          }}
        />
      ) : (
        <Card className="hidden lg:block">
          <CardContent className="flex h-full min-h-[400px] items-center justify-center text-sm text-muted-foreground">
            Selecione um cargo para ver os detalhes.
          </CardContent>
        </Card>
      )}

      {(creating || editing) && (
        <CargoFormDialog
          cargo={editing}
          vinculos={vinculos as CanonicalDim[]}
          grupos={grupos as CanonicalDim[]}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(id) => {
            qc.invalidateQueries({ queryKey: ["mdm", "cargos"] });
            setSelectedId(id ?? selectedId);
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CargoDetailPanel({
  cargo, onClose, onEdit, onDuplicate, onToggle, onDelete,
}: {
  cargo: CargoCanonico;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm text-muted-foreground">Detalhes do Cargo</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{cargo.nome}</h3>
              {cargo.ativo
                ? <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">Ativo</Badge>
                : <Badge variant="outline">Inativo</Badge>}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              Vínculo <Badge variant="outline" className={vinculoBadgeClass(cargo.vinculo_nome)}>{cargo.vinculo_nome ?? "—"}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Salário Base</div>
            <div className="mt-1 text-base font-semibold text-primary">{formatBRL(cargo.salario_base)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Salário Real Esperado</div>
            <div className="mt-1 text-base font-semibold text-emerald-600">{formatBRL(cargo.salario_real_esperado)}</div>
          </div>
        </div>

        <DetailBlock icon={Clock} title="Jornada">
          <div className="text-sm">{cargo.jornada || "—"}</div>
        </DetailBlock>

        <DetailBlock icon={GraduationCap} title="Requisitos">
          <BulletList items={cargo.requisitos} />
        </DetailBlock>

        <DetailBlock icon={Gift} title="Benefícios">
          <BulletList items={cargo.beneficios} />
        </DetailBlock>

        <DetailBlock icon={Star} title="Adicionais">
          <BulletList items={cargo.adicionais} />
        </DetailBlock>

        {cargo.observacoes && (
          <DetailBlock icon={Wallet} title="Observações">
            <div className="text-xs whitespace-pre-wrap">{cargo.observacoes}</div>
          </DetailBlock>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button size="sm" variant="outline" onClick={onDuplicate}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Duplicar
          </Button>
          <Button size="sm" variant="outline" onClick={onToggle}>
            <Power className="mr-1 h-3.5 w-3.5" /> {cargo.ativo ? "Desativar" : "Ativar"}
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t pt-3 text-[11px] text-muted-foreground">
          <div>
            <div>Criado em</div>
            <div className="text-foreground">{cargo.created_at ? new Date(cargo.created_at).toLocaleString("pt-BR") : "—"}</div>
          </div>
          <div>
            <div>Atualizado em</div>
            <div className="text-foreground">{cargo.updated_at ? new Date(cargo.updated_at).toLocaleString("pt-BR") : "—"}</div>
          </div>
          <div className="col-span-2">
            <div>ID</div>
            <div className="font-mono text-[10px] text-foreground break-all">{cargo.id}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailBlock({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <div className="text-xs text-muted-foreground">—</div>;
  return (
    <ul className="space-y-0.5 text-xs">
      {items.map((it, i) => (
        <li key={i} className="flex gap-1.5"><span className="text-primary">•</span><span>{it}</span></li>
      ))}
    </ul>
  );
}

function CargoFormDialog({
  cargo, vinculos, grupos, onClose, onSaved,
}: {
  cargo: CargoCanonico | null;
  vinculos: CanonicalDim[];
  grupos: CanonicalDim[];
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const [nome, setNome] = useState(cargo?.nome ?? "");
  const [vinculoId, setVinculoId] = useState(cargo?.vinculo_id ?? "");
  const [grupoId, setGrupoId] = useState(cargo?.grupo_cargo_id ?? "");
  const [salarioBase, setSalarioBase] = useState(cargo?.salario_base?.toString() ?? "");
  const [salarioReal, setSalarioReal] = useState(cargo?.salario_real_esperado?.toString() ?? "");
  const [jornada, setJornada] = useState(cargo?.jornada ?? "");
  const [nivel, setNivel] = useState(cargo?.nivel ?? "");
  const [requisitos, setRequisitos] = useState((cargo?.requisitos ?? []).join("\n"));
  const [beneficios, setBeneficios] = useState((cargo?.beneficios ?? []).join("\n"));
  const [adicionais, setAdicionais] = useState((cargo?.adicionais ?? []).join("\n"));
  const [observacoes, setObservacoes] = useState(cargo?.observacoes ?? "");
  const [ativo, setAtivo] = useState(cargo?.ativo ?? true);

  const createFn = useServerFn(createCargo);
  const updateFn = useServerFn(updateCargo);

  const mut = useMutation({
    mutationFn: async () => {
      const payload: CargoInput = {
        nome,
        vinculo_id: vinculoId,
        grupo_cargo_id: grupoId || null,
        salario_base: salarioBase ? Number(salarioBase.replace(",", ".")) : null,
        salario_real_esperado: salarioReal ? Number(salarioReal.replace(",", ".")) : null,
        jornada,
        nivel,
        requisitos: requisitos.split("\n").map((s) => s.trim()).filter(Boolean),
        beneficios: beneficios.split("\n").map((s) => s.trim()).filter(Boolean),
        adicionais: adicionais.split("\n").map((s) => s.trim()).filter(Boolean),
        observacoes,
        ativo,
      };
      if (cargo) {
        await updateFn({ data: { id: cargo.id, ...payload } });
        return cargo.id;
      }
      const r = await createFn({ data: payload });
      return r.id;
    },
    onSuccess: (id) => {
      toast.success(cargo ? "Cargo atualizado" : "Cargo criado");
      onSaved(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave = nome.trim() && vinculoId;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cargo ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome do cargo *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Oficial Administrativo" />
            </div>
            <div>
              <Label>Vínculo *</Label>
              <Select value={vinculoId} onValueChange={setVinculoId}>
                <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {vinculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grupo de Cargo</Label>
              <Select value={grupoId || "none"} onValueChange={(v) => setGrupoId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— sem grupo —</SelectItem>
                  {grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Salário Base (R$)</Label>
              <Input value={salarioBase} onChange={(e) => setSalarioBase(e.target.value)} placeholder="3842.00" />
            </div>
            <div>
              <Label>Salário Real Esperado (R$)</Label>
              <Input value={salarioReal} onChange={(e) => setSalarioReal(e.target.value)} placeholder="5210.00" />
            </div>
            <div>
              <Label>Jornada</Label>
              <Input value={jornada} onChange={(e) => setJornada(e.target.value)} placeholder="40h semanais" />
            </div>
            <div>
              <Label>Nível</Label>
              <Input value={nivel} onChange={(e) => setNivel(e.target.value)} placeholder="Superior / Médio / Fundamental" />
            </div>
          </div>
          <div>
            <Label>Requisitos <span className="text-muted-foreground text-xs">(um por linha)</span></Label>
            <Textarea rows={3} value={requisitos} onChange={(e) => setRequisitos(e.target.value)} />
          </div>
          <div>
            <Label>Benefícios <span className="text-muted-foreground text-xs">(um por linha)</span></Label>
            <Textarea rows={3} value={beneficios} onChange={(e) => setBeneficios(e.target.value)} />
          </div>
          <div>
            <Label>Adicionais <span className="text-muted-foreground text-xs">(um por linha)</span></Label>
            <Textarea rows={3} value={adicionais} onChange={(e) => setAdicionais(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={ativo} onCheckedChange={setAtivo} id="ativo-switch" />
            <Label htmlFor="ativo-switch" className="cursor-pointer">Ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!canSave || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}