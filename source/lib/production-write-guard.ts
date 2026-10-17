/** Production endpoints must never receive writes from preview or local servers. */
export function mayWriteToProduction(vercelEnvironment: string | undefined): boolean {
  return vercelEnvironment === 'production';
}
