import type {SupabaseClient} from '@supabase/supabase-js';

// Call only with a server-verified, non-anonymous user. UI account selections
// and user-editable metadata do not establish an existing owner membership.
export async function isExistingOwner(client: Pick<SupabaseClient, 'from'>, userId: string): Promise<boolean> {
 const {data,error}=await client.from('owners').select('id').eq('id',userId).maybeSingle();
 if(error)throw error;
 return data?.id===userId;
}
