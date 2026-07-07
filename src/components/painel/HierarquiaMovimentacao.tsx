import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Info, Building2, Briefcase, Layers, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  EntradaCanonica,
  SaidaCanonica,
  PainelDims,
  SaidaCategoria,
} from "@/lib/painel-canonico.functions";

type Totals = {
  entradas: number;
  saidas: number;
  exoneracoes: number;
  aposentadorias: number;
  vacancias: number;
  falecimentos: number;
  rescisoes: number;
  saldo: number;
};

function emptyTotals(): Totals {
  return {
    entradas: 0,
    saidas: 0,
    exoneracoes: 0,
    aposentadorias: 0,
    vacancias: 0,
    falecimentos: 0,
    rescisoes: 0,
    saldo: 0,
  };
}

function addSaida(t: Totals, cat: SaidaCategoria) {
  t.saidas++;
  if (cat === "Exoneração") t.exoneracoes++;
  else if (cat === "Aposentadoria") t.aposentadorias++;
  else if (cat === "Vacância") t.vacancias++;
  else if (cat === "Falecimento") t.falecimentos++;
  else if (cat === "Rescisão" || cat === "Demissão") t.rescisoes++;
}

type ServidorEvento = {
  key: string;
  nome: string;
  matricula: string | null;
  tipo: "entrada" | "saida";
  data: string;
  categoria?: SaidaCategoria;
};

type Node = {
  key: string;
  label: string;
  totals: Totals;
  children?: Node[];
  servidores?: ServidorEvento[];
  auditNivel?: "secretaria" | "grupo_cargo";
  auditId?: string;
};

function computeSaldo(t: Totals) {
  t.saldo = t.entradas - t.saidas;
  return t;
}

export function HierarquiaMovimentacao({
  entradas,
  saidas,
  dims,
  onOpenAudit,
}: {
  entradas: EntradaCanonica[];
  saidas: SaidaCanonica[];
  dims: PainelDims;
  onOpenAudit: (nivel: "secretaria" | "grupo_cargo", id: string, label: string) => void;
}) {
  const tree = useMemo(() => buildTree(entradas, saidas, dims), [entradas, saidas, dims]);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (k: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr className="text-left">
            <th className="p-2 min-w-[280px]">Dimensão canônica</th>
            <th className="p-2 text-right">Entradas</th>
            <th className="p-2 text-right">Saídas</th>
            <th className="p-2 text-right">Exoner.</th>
            <th className="p-2 text-right">Aposent.</th>
            <th className="p-2 text-right">Vacânc.</th>
            <th className="p-2 text-right">Rescis.</th>
            <th className="p-2 text-right">Saldo</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {tree.map((n) => renderNode(n, 0, open, toggle, onOpenAudit))}
          {tree.length === 0 && (
            <tr>
              <td colSpan={9} className="p-6 text-center text-muted-foreground">
                Nenhuma movimentação canônica no período selecionado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderNode(
  node: Node,
  depth: number,
  open: Set<string>,
  toggle: (k: string) => void,
  onOpenAudit: (nivel: "secretaria" | "grupo_cargo", id: string, label: string) => void,
): React.ReactNode {
  const isOpen = open.has(node.key);
  const hasKids = (node.children && node.children.length > 0) || (node.servidores && node.servidores.length > 0);
  const saldoTone =
    node.totals.saldo > 0 ? "text-emerald-600" : node.totals.saldo < 0 ? "text-rose-600" : "text-amber-600";

  const icon = (() => {
    if (depth === 0) return <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />;
    if (depth === 1) return <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />;
    if (depth === 2) return <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    return null;
  })();

  return (
    <>
      <tr key={node.key} className="border-t hover:bg-accent/40">
        <td className="p-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 18 }}>
            {hasKids ? (
              <button
                type="button"
                onClick={() => toggle(node.key)}
                className="rounded p-0.5 hover:bg-muted"
                aria-label={isOpen ? "Recolher" : "Expandir"}
              >
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {icon}
            <span className={depth === 0 ? "font-semibold" : ""}>{node.label}</span>
          </div>
        </td>
        <td className="p-2 text-right tabular-nums text-emerald-600">{node.totals.entradas}</td>
        <td className="p-2 text-right tabular-nums text-rose-600">{node.totals.saidas}</td>
        <td className="p-2 text-right tabular-nums">{node.totals.exoneracoes}</td>
        <td className="p-2 text-right tabular-nums">{node.totals.aposentadorias}</td>
        <td className="p-2 text-right tabular-nums">{node.totals.vacancias}</td>
        <td className="p-2 text-right tabular-nums">{node.totals.rescisoes}</td>
        <td className={`p-2 text-right font-semibold tabular-nums ${saldoTone}`}>
          {node.totals.saldo > 0 ? `+${node.totals.saldo}` : node.totals.saldo}
        </td>
        <td className="p-2">
          {node.auditNivel && node.auditId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onOpenAudit(node.auditNivel!, node.auditId!, node.label)}
              title="Auditar composição"
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </td>
      </tr>
      {isOpen && node.children?.map((c) => renderNode(c, depth + 1, open, toggle, onOpenAudit))}
      {isOpen && node.servidores?.map((s) => (
        <tr key={s.key} className="border-t bg-muted/10">
          <td className="p-2">
            <div className="flex items-center gap-1" style={{ paddingLeft: (depth + 1) * 18 }}>
              <span className="w-4" />
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{s.nome}</span>
              {s.matricula && <span className="text-muted-foreground ml-1">· {s.matricula}</span>}
            </div>
          </td>
          <td className="p-2 text-right">{s.tipo === "entrada" ? "1" : ""}</td>
          <td className="p-2 text-right">{s.tipo === "saida" ? "1" : ""}</td>
          <td colSpan={5} className="p-2 text-muted-foreground">
            {s.categoria && (
              <Badge variant="outline" className="text-[10px] mr-2">
                {s.categoria}
              </Badge>
            )}
            {new Date(s.data).toLocaleDateString("pt-BR")}
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

function buildTree(
  entradas: EntradaCanonica[],
  saidas: SaidaCanonica[],
  dims: PainelDims,
): Node[] {
  const secMap = new Map(dims.secretarias.map((s) => [s.id, s.nome]));
  const gcMap = new Map(dims.grupos_cargo.map((g) => [g.id, g.nome]));
  const espMap = new Map(dims.especialidades.map((e) => [e.id, e.nome]));

  // structure: sec -> gc -> esp -> servidores
  type Bucket = {
    totals: Totals;
    children: Map<string, Bucket>;
    servidores: ServidorEvento[];
  };
  const mk = (): Bucket => ({ totals: emptyTotals(), children: new Map(), servidores: [] });
  const root = new Map<string, Bucket>();

  const bump = (secId: string, gcId: string, espId: string, ev: ServidorEvento) => {
    let sec = root.get(secId);
    if (!sec) { sec = mk(); root.set(secId, sec); }
    let gc = sec.children.get(gcId);
    if (!gc) { gc = mk(); sec.children.set(gcId, gc); }
    let esp = gc.children.get(espId);
    if (!esp) { esp = mk(); gc.children.set(espId, esp); }
    for (const b of [sec, gc, esp]) {
      if (ev.tipo === "entrada") b.totals.entradas++;
      else addSaida(b.totals, ev.categoria ?? "Outros");
    }
    esp.servidores.push(ev);
  };

  const SEC_NULL = "__sem_sec__";
  const GC_NULL = "__sem_gc__";
  const ESP_NULL = "__sem_esp__";

  for (const e of entradas) {
    bump(
      e.secretaria_id ?? SEC_NULL,
      e.grupo_cargo_id ?? GC_NULL,
      e.especialidade_id ?? ESP_NULL,
      {
        key: `e-${e.id}`,
        nome: e.nome,
        matricula: e.matricula,
        tipo: "entrada",
        data: e.data,
      },
    );
  }
  for (const s of saidas) {
    bump(
      s.secretaria_id ?? SEC_NULL,
      s.grupo_cargo_id ?? GC_NULL,
      s.especialidade_id ?? ESP_NULL,
      {
        key: `s-${s.id}`,
        nome: s.nome,
        matricula: s.matricula,
        tipo: "saida",
        data: s.data,
        categoria: s.saida_categoria,
      },
    );
  }

  const labelSec = (id: string) => (id === SEC_NULL ? "⚠ Secretaria não classificada" : secMap.get(id) ?? id);
  const labelGc = (id: string) => (id === GC_NULL ? "⚠ Grupo de cargo não classificado" : gcMap.get(id) ?? id);
  const labelEsp = (id: string) => (id === ESP_NULL ? "— Sem especialidade" : espMap.get(id) ?? id);

  const result: Node[] = [];
  for (const [secId, sec] of root) {
    computeSaldo(sec.totals);
    const secNode: Node = {
      key: `sec:${secId}`,
      label: labelSec(secId),
      totals: sec.totals,
      auditNivel: secId !== SEC_NULL ? "secretaria" : undefined,
      auditId: secId !== SEC_NULL ? secId : undefined,
      children: [],
    };
    for (const [gcId, gc] of sec.children) {
      computeSaldo(gc.totals);
      const gcNode: Node = {
        key: `sec:${secId}>gc:${gcId}`,
        label: labelGc(gcId),
        totals: gc.totals,
        auditNivel: gcId !== GC_NULL ? "grupo_cargo" : undefined,
        auditId: gcId !== GC_NULL ? gcId : undefined,
        children: [],
      };
      for (const [espId, esp] of gc.children) {
        computeSaldo(esp.totals);
        const espNode: Node = {
          key: `sec:${secId}>gc:${gcId}>esp:${espId}`,
          label: labelEsp(espId),
          totals: esp.totals,
          servidores: esp.servidores.sort((a, b) => a.data.localeCompare(b.data)),
        };
        gcNode.children!.push(espNode);
      }
      gcNode.children!.sort((a, b) => a.totals.saldo - b.totals.saldo);
      secNode.children!.push(gcNode);
    }
    secNode.children!.sort((a, b) => a.totals.saldo - b.totals.saldo);
    result.push(secNode);
  }
  result.sort((a, b) => a.totals.saldo - b.totals.saldo);
  return result;
}