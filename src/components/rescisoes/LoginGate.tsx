import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * Real authentication gate backed by Supabase Auth.
 * Session is managed by the Supabase client (persisted + auto-refreshed).
 * Server functions are independently protected by `requireSupabaseAuth`;
 * this gate is the UX layer that surfaces a sign-in form.
 */
export function LoginGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Listener first to catch SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setChecked(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Verificando sessão…
      </div>
    );
  }
  if (session) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass,
          options: {
            emailRedirectTo:
              typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo(
            "Conta criada. Verifique seu e-mail para confirmar antes de entrar.",
          );
        }
      }
    } catch (e: any) {
      setErr(e?.message ?? "Falha na autenticação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Acesso Restrito</CardTitle>
          <p className="text-xs text-muted-foreground">
            DP - CAB — RH (autenticação obrigatória)
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pass" className="text-xs">Senha</Label>
              <Input
                id="pass"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
            {info && <p className="text-xs text-muted-foreground">{info}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setErr("");
                setInfo("");
                setMode(mode === "signin" ? "signup" : "signin");
              }}
            >
              {mode === "signin"
                ? "Não tem conta? Criar uma"
                : "Já tem conta? Entrar"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}