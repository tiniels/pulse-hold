import { useMemo, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Download, Search } from "lucide-react";

export type DrillColumn<T> = {
  key: string;
  label: string;
  width?: string;
  render?: (row: T) => ReactNode;
  value?: (row: T) => string | number | null | undefined;
};

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Generic, reusable drill-down dialog for chart clicks.
 * Displays a paginated/searchable table of records that compose the clicked segment.
 */
export function DrillDialog<T>({
  open,
  onClose,
  title,
  subtitle,
  rows,
  columns,
  searchKeys,
  csvName,
  onRowClick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  rows: T[];
  columns: DrillColumn<T>[];
  searchKeys?: Array<(row: T) => string | null | undefined>;
  csvName?: string;
  onRowClick?: (row: T) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    const keys =
      searchKeys ??
      columns.map((c) => (r: T) => {
        const v = c.value ? c.value(r) : (r as any)[c.key];
        return v == null ? "" : String(v);
      });
    return rows.filter((r) => keys.some((fn) => (fn(r) ?? "").toLowerCase().includes(s)));
  }, [rows, search, columns, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(cur * pageSize, cur * pageSize + pageSize);

  const exportCSV = () => {
    const headers = columns.map((c) => c.label);
    const body = filtered.map((r) =>
      columns
        .map((c) => {
          const v = c.value ? c.value(r) : (r as any)[c.key];
          return csvEscape(v);
        })
        .join(";"),
    );
    const text = [headers.join(";"), ...body].join("\n");
    const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(csvName ?? title).replace(/[^a-z0-9_\-]+/gi, "_").slice(0, 60)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader>
          <DialogTitle className="text-base">
            {title}{" "}
            <span className="text-muted-foreground font-normal">
              — {rows.length.toLocaleString("pt-BR")} registros
            </span>
          </DialogTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar..."
              className="h-9 pl-8"
            />
          </div>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[90px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-9 gap-1.5"
          >
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>

        <div className="border rounded-md overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key} style={c.width ? { width: c.width } : undefined}>
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r, idx) => (
                <TableRow
                  key={idx}
                  className={onRowClick ? "cursor-pointer hover:bg-accent/50" : ""}
                  onClick={() => onRowClick?.(r)}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className="text-xs">
                      {c.render
                        ? c.render(r)
                        : ((c.value ? c.value(r) : (r as any)[c.key]) ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    Nenhum registro
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Mostrando {pageRows.length} de {filtered.length.toLocaleString("pt-BR")} • Total: {rows.length.toLocaleString("pt-BR")}
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={cur === 0}>«</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(cur - 1)} disabled={cur === 0}>‹</Button>
            <span className="text-xs text-muted-foreground px-2 self-center">
              Pág {cur + 1}/{totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(cur + 1)} disabled={cur >= totalPages - 1}>›</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={cur >= totalPages - 1}>»</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}