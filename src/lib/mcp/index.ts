import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listGruposKpi from "./tools/list-grupos-kpi";
import listSecretariasKpi from "./tools/list-secretarias-kpi";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "dpcab-mcp",
  title: "DPCAB HR Analytics MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools over the DPCAB HR data warehouse. Use `list_grupos_kpi` for admissions/rescissions/chamamentos by canonical cargo group, and `list_secretarias_kpi` for the same metrics by canonical secretariat.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listGruposKpi, listSecretariasKpi],
});