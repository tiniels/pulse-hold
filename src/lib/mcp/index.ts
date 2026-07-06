import { defineMcp } from "@lovable.dev/mcp-js";
import listGruposKpi from "./tools/list-grupos-kpi";
import listSecretariasKpi from "./tools/list-secretarias-kpi";

export default defineMcp({
  name: "dpcab-mcp",
  title: "DPCAB HR Analytics MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools over the DPCAB HR data warehouse. Use `list_grupos_kpi` for admissions/rescissions/chamamentos by canonical cargo group, and `list_secretarias_kpi` for the same metrics by canonical secretariat.",
  tools: [listGruposKpi, listSecretariasKpi],
});