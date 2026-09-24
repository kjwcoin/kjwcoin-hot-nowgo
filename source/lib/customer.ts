import {session} from './server';
import {unifiedMember} from './unified-auth';
export {LEVELS} from './loyalty';
export const CONSENT_VERSION='2026-09-24-unified-v4';
export const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export const customer=unifiedMember;
export async function identity(req:Request){const c=await customer(req);return c?{id:c.id,fresh:false}:session(req)}
