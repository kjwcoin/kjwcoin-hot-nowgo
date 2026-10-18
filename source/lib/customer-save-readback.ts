/** Confirm a user bookmark write via a fresh owner-scoped RLS read, never a client-provided flag. */
export function customerSavedStateMatches(
  storedRow: unknown, menuId: string, expectedSaved: boolean
): boolean {
  if (typeof menuId !== 'string' || menuId.length === 0) return false;
  if (storedRow === null) return expectedSaved === false;
  if (typeof storedRow !== 'object' || Array.isArray(storedRow)) return false;
  const storedId = (storedRow as {menu_id?: unknown}).menu_id;
  return expectedSaved === true && storedId === menuId;
}
