import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

const KEY = "dpcab_auth_v1";
const USER = "adm";
const PASS = "Cab@pmsp";

export function LoginGate({ children }: { children: React.ReactNode }) {
  // Start true on SSR to avoid hydration flash; client effect re-validates.
  const [ok, setOk] = useState(false);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const persisted =
        localStorage.getItem(KEY) === "1" || sessionStorage.getItem(KEY) === "1";
      if (persisted) setOk(true);
    }
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (ok) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.trim() === USER && pass === PASS) {
      localStorage.setItem(KEY, "1");
      setOk(true);
    } else {
      setErr("Usuário ou senha inválidos");
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
          <p className="text-xs text-muted-foreground">Dashboard de Rescisões — RH</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="user" className="text-xs">Usuário</Label>
              <Input id="user" autoFocus value={user} onChange={(e) => setUser(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pass" className="text-xs">Senha</Label>
              <Input id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}