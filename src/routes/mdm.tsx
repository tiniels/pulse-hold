import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import {
  listAliases, listDim, listGruposKPI, listSecretariasKPI, resolverAlias,
  type AliasTipo, type AliasPendente, type CanonicalDim, type GrupoKPI, type SecretariaKPI,
} from "@/lib/canonical.functions";

export const Route = createFileRoute("/mdm")({
  head: () => ({
    meta: [
      { title: "MDM Canônico — Governança de Dados" },
      { name: "description", content: "Painel de governança de dimensões canônicas: cargos, secretarias, vínculos, motivos e situações." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MDMPage,
});

const TIPOS: { key: AliasTipo; label: string }[] = [
  { key: "cargo", label: "Cargos" },
  { key: "secretaria", label: "Secretarias" },
  { key: "vinculo", label: "Vínculos" },
  { key: "motivo", label: "Motivos" },
  { key: "situacao", label: "Situações" },
];

function MDMPage() {
  return (
    <LoginGate>
      <div className="min-h-screen bg-background px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Governança canônica (MDM)</h1>
              <p className="text-sm text-muted-foreground">
                Central de dimensões unificadas — cargo, secretaria, vínculo, motivo, situação.
              </p>
            </div>
            <nav className="flex gap-2 text-sm">
              <Link to="/dashboard" className="rounded-md border px-3 py-1.5 hover:bg-accent">Dashboard</Link>
              <Link to="/chamamentos" className="rounded-md border px-3 py-1.5 hover:bg-accent">Chamamentos</Link>
              <Link to="/admissao" className="rounded-md border px-3 py-1.5 hover:bg-accent">Admissões</Link>
              <Link to="/rescisoes" className="rounded-md border px-3 py-1.5 hover:bg-accent">Rescisões</Link>
            </nav>
          </header>

          <KpiOverview />

          <Tabs defaultValue="cargo">
            <TabsList>
              {TIPOS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
            {TIPOS.map((t) => (
              <TabsContent key={t.key} value={t.key} className="mt-4">
                <AliasPanel tipo={t.key} label={t.label} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </LoginGate>
  );
}

const gruposKpiQuery = queryOptions({
  queryKey: ["mdm", "kpi", "grupos"],
  queryFn: () => listGruposKPI(),
});
const secKpiQuery = queryOptions({
  queryKey: ["mdm", "kpi", "secretarias"],
  queryFn: () => listSecretariasKPI(),
});

function KpiOverview() {
  const grupos = useSuspenseQuery(gruposKpiQuery).data as GrupoKPI[];
  const secs = useSuspenseQuery(secKpiQuery).data as SecretariaKPI[];

  const topGrupos = grupos.slice(0, 5);
  const topSecs = secs.slice(0, 5);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Top 5 grupos de cargo (por admissões)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead className="text-right">Adm.</TableHead>
                <TableHead className="text-right">Resc.</TableHead>
                <TableHead className="text-right">Cham.</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topGrupos.map((g) => (
                <TableRow key={g.grupo_id}>
                  <TableCell className="font-medium">{g.grupo_nome}</TableCell>
                  <TableCell className="text-right">{g.admissoes}</TableCell>
                  <TableCell className="text-right">{g.rescisoes}</TableCell>
                  <TableCell className="text-right">{g.chamamentos}</TableCell>
                  <TableCell className={`text-right font-semibold ${g.saldo < 0 ? "text-destructive" : ""}`}>{g.saldo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Top 5 secretarias (por admissões)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Secretaria</TableHead>
                <TableHead className="text-right">Adm.</TableHead>
                <TableHead className="text-right">Resc.</TableHead>
                <TableHead className="text-right">Cham.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSecs.map((s) => (
                <TableRow key={s.secretaria_id}>
                  <TableCell className="font-medium">{s.secretaria_nome}</TableCell>
                  <TableCell className="text-right">{s.admissoes}</TableCell>
                  <TableCell className="text-right">{s.rescisoes}</TableCell>
                  <TableCell className="text-right">{s.chamamentos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AliasPanel({ tipo, label }: { tipo: AliasTipo; label: string }) {
  const [filter, setFilter] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const aliasesQuery = useSuspenseQuery(
    queryOptions({
      queryKey: ["mdm", "aliases", tipo, onlyPending],
      queryFn: () => listAliases({ data: { tipo, apenasPendentes: onlyPending } }),
    }),
  );
  const dimQuery = useSuspenseQuery(
    queryOptions({
      queryKey: ["mdm", "dim", tipo],
      queryFn: () => listDim({ data: { tipo } }),
    }),
  );

  const aliases = aliasesQuery.data as AliasPendente[];
  const dims = dimQuery.data as CanonicalDim[];

  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return aliases;
    return aliases.filter((a) =>
      a.texto_origem_norm.includes(q) ||
      (a.canonico_nome ?? "").toUpperCase().includes(q),
    );
  }, [aliases, filter]);

  const totalPend = aliases.filter((a) => !a.revisado).length;
  const totalRev = aliases.length - totalPend;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Aliases de {label}</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{totalRev} revisados</Badge>
            <Badge variant={totalPend > 0 ? "destructive" : "outline"}>{totalPend} pendentes</Badge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filtrar por texto…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-xs"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
            />
            somente pendentes
          </label>
          <span className="ml-auto text-xs text-muted-foreground">
            exibindo {filtered.length} de {aliases.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[560px] overflow-auto rounded border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[45%]">Texto de origem</TableHead>
                <TableHead>Dimensão canônica</TableHead>
                <TableHead className="w-[110px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <AliasRow key={a.id} alias={a} dims={dims} tipo={tipo} />
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Nenhum alias para os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function AliasRow({ alias, dims, tipo }: { alias: AliasPendente; dims: CanonicalDim[]; tipo: AliasTipo }) {
  const qc = useQueryClient();
  const resolveFn = useServerFn(resolverAlias);
  const [value, setValue] = useState<string>(alias.canonico_id ?? "");
  const [saving, setSaving] = useState(false);

  async function save(newId: string) {
    setSaving(true);
    try {
      await resolveFn({ data: { tipo, aliasId: alias.id, canonicoId: newId } });
      setValue(newId);
      await qc.invalidateQueries({ queryKey: ["mdm"] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="font-mono text-xs text-foreground">{alias.texto_origem ?? alias.texto_origem_norm}</div>
        <div className="text-[10px] text-muted-foreground">{alias.texto_origem_norm}</div>
      </TableCell>
      <TableCell>
        <Select value={value} onValueChange={save} disabled={saving}>
          <SelectTrigger className="max-w-[420px]">
            <SelectValue placeholder="Selecionar…" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {dims.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right align-top">
        {alias.revisado ? (
          <Badge variant="outline">revisado</Badge>
        ) : (
          <Badge variant="destructive">pendente</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}