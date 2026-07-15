import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Beta namespace on supabase-js; typed locally so TS resolves the three methods.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthNs }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const { authorization_id } = Route.useSearch();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!authorization_id) {
        setError("Missing authorization_id");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorization_id);
        if (cancel) return;
        if (error) {
          setError((error as any)?.message ?? "Could not load authorization request");
        } else {
          const immediate = data?.redirect_url ?? data?.redirect_to;
          if (immediate && !data?.client) {
            window.location.href = immediate;
            return;
          }
          setDetails(data);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? "Failed to load authorization");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [authorization_id]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError((error as any)?.message ?? "Authorization failed");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <LoginGate>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Conectar aplicativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {details && (
              <>
                <p className="text-sm">
                  <strong>{details?.client?.name ?? "Um aplicativo"}</strong> está solicitando
                  acesso à sua conta DPCAB. Ele poderá usar as ferramentas MCP habilitadas
                  enquanto você estiver conectado.
                </p>
                <p className="text-xs text-muted-foreground">
                  Este acesso não ignora as políticas de permissão do sistema — as ferramentas
                  operam como você, respeitando seu papel (staff/admin).
                </p>
                <div className="flex gap-2 pt-2">
                  <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => decide(false)}
                    className="flex-1"
                  >
                    Recusar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </LoginGate>
  );
}