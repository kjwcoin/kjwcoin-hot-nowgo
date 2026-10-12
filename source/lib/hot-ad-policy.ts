export const HOT_AD_MIN_BID=8000;
export const HOT_AD_TERMS='2026-10-12-hot-local-auction-v1';
export const RAMEN_REFERENCES={milder:'신라면보다 순함',similar:'신라면과 비슷함',hotter:'신라면보다 매움'} as const;
export function validAdBudget(value:number){return Number.isSafeInteger(value)&&value>=HOT_AD_MIN_BID&&value<=10000000;}
export function validAdReference(value:unknown):value is keyof typeof RAMEN_REFERENCES{return typeof value==='string'&&Object.hasOwn(RAMEN_REFERENCES,value);}
export function adGrossAmount(budget:number){if(!validAdBudget(budget))throw Error('invalid_budget');return budget+Math.round(budget*0.1);}
export type AdBidRank={id:string;budget:number;submitted_at:string};
export function rankAdBids<T extends AdBidRank>(bids:readonly T[]){return [...bids].sort((a,b)=>b.budget-a.budget||Date.parse(a.submitted_at)-Date.parse(b.submitted_at)||a.id.localeCompare(b.id));}
