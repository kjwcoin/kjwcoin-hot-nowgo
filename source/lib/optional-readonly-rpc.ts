/** A missing *optional read-only* RPC must not take down public menu search.
 * All permission, network and query errors still fail closed.
 */
export function isMissingReadOnlyRpc(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || Array.isArray(error)) return false;
  const code = (error as {code?:unknown}).code;
  return code === 'PGRST202' || code === '42883';
}
