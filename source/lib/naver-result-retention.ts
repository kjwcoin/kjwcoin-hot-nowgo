// Results live only in the current component, until the next query or 24 hours.
export const NAVER_RESULT_LIFETIME_MS=24*60*60*1000;
export function naverResultsExpired(expiresAt:number,now=Date.now()):boolean{return !Number.isFinite(expiresAt)||now>=expiresAt}
