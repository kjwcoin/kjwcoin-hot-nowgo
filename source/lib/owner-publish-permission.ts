/** Fail closed: a database publish-rights RPC must return the literal boolean true. */
export function isExplicitOwnerGrant(value: unknown): value is true {
  return value === true;
}

/** HOT owner reports must not bypass the paid, verified-store management grant. */
export function requiresHotOwnerSubscription(planet: unknown, role: unknown): boolean {
  return planet === 'hot' && role === 'owner';
}
