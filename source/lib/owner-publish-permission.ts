/** Fail closed: a database publish-rights RPC must return the literal boolean true. */
export function isExplicitOwnerGrant(value: unknown): value is true {
  return value === true;
}
