import {reply} from '@/lib/server';

// Fail closed until menu evidence and database-backed publication rights are
// verified server-side. A nonempty permissionReference supplied by a client is
// not authorization. Do not read or expose candidate records in this endpoint.
// Separate RLS hardening remains required before enabling candidate listings.
export async function GET(req:Request){
 return reply(req,{candidates:[]});
}
