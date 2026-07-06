import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Search, Loader2, Pencil, Copy, Trash2, Eye, Power } from "lucide-react";
import { toast } from "sonner";
import {
  listDimensoes, createDimensao, updateDimensao, deleteDimensao, duplicateDimensao,
  listAliasesForDim, DIM_SCHEMAS, type AliasTipo, type DimensaoRow,
} from "@/lib/canonical.functions";

type Props = {
  tipo: AliasTipo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type EditingState =
  | { mode: "create" }
  | { mode: "edit"; row: DimensaoRow }
  | null;

export function DimensionManagerDialog({ tipo, open, onOpenChange }: Props) {
  const schema = DIM_SCHEMAS[tipo];
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<EditingState>(null);
  const [confirmDelete, setConfirmDelete] = useState<DimensaoRow | null>(null);
  const [aliasesFor, setAliasesFor] = useState<DimensaoRow | null>(null);

  const query = useQuery({
    queryKey: ["mdm", "dimensoes", tipo],
    queryFn: () => listDimensoes({ data: { tipo } }),
    enabled: open,
  });

  const rows: DimensaoRow[] = query.data ?? [];
  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.nome.toUpperCase().includes(q) ||
      Object.values(r.extras).some((v) => String(v ?? "").toUpperCase().includes(q)),
    );
  }, [rows, filter]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["mdm"] });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Gerenciar dimensões — {schema.label}</DialogTitle>
            <DialogDescription>
              Criar, editar, duplicar, ativar/desativar e excluir dimensões canônicas.
              Alterações se refletem em todos os aliases vinculados.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Pesquisar…"
                className="pl-8"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filtered.length} de {rows.length}
            </span>
            <Button className="ml-auto" onClick={() => setEditing({ mode: "create" })}>
              <Plus className="mr-1 h-4 w-4" /> Nova Dimensão
            </Button>
          </div>

          <div className="max-h-[520px] overflow-auto rounded border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  {schema.extraFields.map((f) => (
                    <TableHead key={f.key}>{f.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Aliases</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={schema.extraFields.length + 4} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!query.isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={schema.extraFields.length + 4} className="py-8 text-center text-muted-foreground">
                      Nenhuma dimensão encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((row) => (
                  <DimensionRow
                    key={row.id}
                    row={row}
                    tipo={tipo}
                    onEdit={() => setEditing({ mode: "edit", row })}
                    onDelete={() => setConfirmDelete(row)}
                    onViewAliases={() => setAliasesFor(row)}
                    onChanged={invalidate}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {editing && (
        <DimensionFormDialog
          tipo={tipo}
          initial={editing.mode === "edit" ? editing.row : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}

      {confirmDelete && (
        <DeleteConfirm
          tipo={tipo}
          row={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onDone={() => {
            setConfirmDelete(null);
            invalidate();
          }}
        />
      )}

      {aliasesFor && (
        <AliasesDialog
          tipo={tipo}
          row={aliasesFor}
          onClose={() => setAliasesFor(null)}
        />
      )}
    </>
  );
}

function DimensionRow({
  row, tipo, onEdit, onDelete, onViewAliases, onChanged,
}: {
  row: DimensaoRow;
  tipo: AliasTipo;
  onEdit: () => void;
  onDelete: () => void;
  onViewAliases: () => void;
  onChanged: () => void;
}) {
  const schema = DIM_SCHEMAS[tipo];
  const updateFn = useServerFn(updateDimensao);
  const dupFn = useServerFn(duplicateDimensao);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await updateFn({ data: { tipo, id: row.id, ativo: !row.ativo } });
      toast.success(row.ativo ? "Desativada" : "Ativada");
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    setBusy(true);
    try {
      await dupFn({ data: { tipo, id: row.id } });
      toast.success("Duplicada");
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <TableRow className={row.ativo ? "" : "opacity-60"}>
      <TableCell className="font-medium">{row.nome}</TableCell>
      {schema.extraFields.map((f) => (
        <TableCell key={f.key} className="text-muted-foreground">
          {row.extras[f.key] == null || row.extras[f.key] === "" ? "—" : String(row.extras[f.key])}
        </TableCell>
      ))}
      <TableCell className="text-right">
        <button className="text-xs underline decoration-dotted" onClick={onViewAliases}>
          {row.aliases_count}
        </button>
      </TableCell>
      <TableCell className="text-center">
        <Switch checked={row.ativo} disabled={busy} onCheckedChange={toggle} />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={busy}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={duplicate}>
              <Copy className="mr-2 h-4 w-4" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewAliases}>
              <Eye className="mr-2 h-4 w-4" /> Ver aliases vinculados
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggle}>
              <Power className="mr-2 h-4 w-4" /> {row.ativo ? "Desativar" : "Ativar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function DimensionFormDialog({
  tipo, initial, onClose, onSaved,
}: {
  tipo: AliasTipo;
  initial: DimensaoRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const schema = DIM_SCHEMAS[tipo];
  const createFn = useServerFn(createDimensao);
  const updateFn = useServerFn(updateDimensao);
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [extras, setExtras] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    schema.extraFields.forEach((f) => {
      const v = initial?.extras[f.key];
      base[f.key] = v == null ? "" : String(v);
    });
    return base;
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!nome.trim()) {
      toast.error("Informe um nome.");
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await updateFn({ data: { tipo, id: initial.id, nome, ativo, extras } });
        toast.success("Dimensão atualizada");
      } else {
        await createFn({ data: { tipo, nome, ativo, extras } });
        toast.success("Dimensão criada");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar" : "Nova"} — {schema.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </div>
          {schema.extraFields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}{f.required ? " *" : ""}</Label>
              <Input
                type={f.type === "number" ? "number" : "text"}
                value={extras[f.key] ?? ""}
                onChange={(e) => setExtras((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          {schema.hasAtivo && (
            <div className="flex items-center gap-3">
              <Switch checked={ativo} onCheckedChange={setAtivo} id="ativo" />
              <Label htmlFor="ativo">Ativa</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirm({
  tipo, row, onClose, onDone,
}: {
  tipo: AliasTipo;
  row: DimensaoRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const delFn = useServerFn(deleteDimensao);
  const [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    try {
      await delFn({ data: { tipo, id: row.id } });
      toast.success("Excluída");
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir "{row.nome}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {row.aliases_count > 0 ? (
              <>
                Esta dimensão possui <b>{row.aliases_count}</b> alias(es) vinculado(s).
                A exclusão pode falhar se houver registros dependentes — prefira <b>desativar</b>.
              </>
            ) : (
              "Esta ação não pode ser desfeita."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AliasesDialog({
  tipo, row, onClose,
}: {
  tipo: AliasTipo;
  row: DimensaoRow;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["mdm", "aliases-for-dim", tipo, row.id],
    queryFn: () => listAliasesForDim({ data: { tipo, id: row.id } }),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aliases vinculados — {row.nome}</DialogTitle>
          <DialogDescription>
            Textos de origem que atualmente resolvem para esta dimensão canônica.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] overflow-auto rounded border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Texto de origem</TableHead>
                <TableHead className="w-[110px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && (query.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                    Nenhum alias vinculado.
                  </TableCell>
                </TableRow>
              )}
              {(query.data ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">
                    {a.texto_origem ?? a.texto_origem_norm}
                    <div className="text-[10px] text-muted-foreground">{a.texto_origem_norm}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {a.revisado ? (
                      <Badge variant="outline">revisado</Badge>
                    ) : (
                      <Badge variant="destructive">pendente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}