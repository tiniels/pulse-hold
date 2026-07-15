// Server-side error helper. Logs the underlying database/provider error
// server-side while surfacing a safe, generic message to clients so that
// internal table/column/constraint names don't leak through UI toasts.

export function throwSafe(error: unknown, context?: string): never {
  // Full detail only in server logs.
  console.error(`[server-fn]${context ? ` ${context}` : ""}`, error);
  throw new Error("Não foi possível concluir a operação. Tente novamente.");
}

export function assertNoError(
  result: { error: { message: string } | null } | { error: null },
  context?: string,
): void {
  const err = (result as { error: unknown }).error;
  if (err) throwSafe(err, context);
}