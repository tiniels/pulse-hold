import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  className?: string;
};

export function MultiSelect({ label, options, selected, onChange, searchable = true, className }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const s = q.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [options, q]);
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-9 justify-between min-w-[180px] gap-2", className)}>
          <span className="truncate">
            {label}
            {selected.length > 0 && (
              <Badge variant="secondary" className="ml-2">{selected.length}</Badge>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2 border-b flex items-center gap-2">
          {searchable && (
            <Input
              placeholder="Buscar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8"
            />
          )}
        </div>
        <div className="flex items-center justify-between px-2 py-1 text-xs border-b">
          <button className="hover:underline" onClick={() => onChange(options)}>Selecionar todas</button>
          <button className="hover:underline" onClick={() => onChange([])}>Limpar</button>
        </div>
        <div className="max-h-64 overflow-auto p-1">
          {filtered.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className={cn(
                  "w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 hover:bg-accent",
                  checked && "bg-accent/50",
                )}
              >
                <span className={cn("w-4 h-4 border rounded flex items-center justify-center", checked && "bg-primary border-primary")}>
                  {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="text-xs text-muted-foreground p-2">Nenhum resultado</div>}
        </div>
        {selected.length > 0 && (
          <div className="border-t p-2 flex flex-wrap gap-1 max-h-24 overflow-auto">
            {selected.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                <span className="truncate max-w-[140px]">{s}</span>
                <button onClick={() => toggle(s)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}