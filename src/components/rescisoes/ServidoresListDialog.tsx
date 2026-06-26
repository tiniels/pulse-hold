import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Aggregated } from "@/lib/rescisao-aggregate";

type SortKey = "matricula" | "nome" | "cargo_nome" | "secretaria_nome" | "vinculo_categoria";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toCSV(rows: Aggregated[]): string {
  const headers = ["Prontuário", "Nome do Servidor", "Cargo / Função", "Secretaria de Lotação", "Natureza do Vínculo Atual"];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => [
    r.matricula ?? "", r.nome, r.cargo_nome, r.secretaria_nome, r.vinculo_categoria,
  ].map(esc).join(";"));
  return [headers.join(";"), ...body].join("\n");
}

export function ServidoresListDialog({
  open, onClose, title, rows, onRowClick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: Aggregated[];
  onRowClick?: (r: Aggregated) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SortKey>("data_rescisao");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      r.nome.toLowerCase().includes(s) ||
      r.cargo_nome.toLowerCase().includes(s) ||
      r.secretaria_nome.toLowerCase().includes(s),
    );
  }, [rows, search]);

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
  const cur = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(cur * pageSize, cur * pageSize + pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(true); }
  };

  const exportCSV = () => {
    const blob = new Blob(["\uFEFF" + toCSV(sorted)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9_\-]+/gi, "_").slice(0, 60)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader>
          <DialogTitle className="text-base">
            {title} <span className="text-muted-foreground font-normal">— {rows.length.toLocaleString("pt-BR")} servidores</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar por nome, cargo, secretaria..."
              className="h-9 pl-8"
            />
          </div>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
            <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 gap-1.5">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>

        <div className="border rounded-md overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead><SortBtn label="Nome" k="nome" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Cargo" k="cargo_nome" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Secretaria" k="secretaria_nome" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Admissão" k="data_admissao" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Rescisão" k="data_rescisao" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
                <TableHead><SortBtn label="Motivo" k="motivo_categoria" cur={sortKey} asc={sortAsc} on={toggleSort} /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow
                  key={r.id}
                  className={onRowClick ? "cursor-pointer hover:bg-accent/50" : ""}
                  onClick={() => onRowClick?.(r)}
                >
                  <TableCell className="text-xs font-medium max-w-[240px] truncate">{r.nome}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{r.cargo_nome}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate">{r.secretaria_nome}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmt(r.data_admissao)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmt(r.data_rescisao)}</TableCell>
                  <TableCell className="text-xs"><Badge variant="outline">{r.motivo_categoria}</Badge></TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhum servidor</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Mostrando {pageRows.length} de {sorted.length.toLocaleString("pt-BR")} • Total filtrado: {rows.length.toLocaleString("pt-BR")}
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={cur === 0}>«</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(cur - 1)} disabled={cur === 0}>‹</Button>
            <span className="text-xs text-muted-foreground px-2 self-center">Pág {cur + 1}/{totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(cur + 1)} disabled={cur >= totalPages - 1}>›</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={cur >= totalPages - 1}>»</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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