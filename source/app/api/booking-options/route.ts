export const dynamic='force-dynamic';
export async function GET(request:Request){
 const slug=new URL(request.url).searchParams.get('slug');
 const headers={'Cache-Control':'no-store'};
 if(!slug||!/^[a-zA-Z0-9_-]{1,100}$/.test(slug))return Response.json({error:'Invalid store'},{status:400,headers});
 try{
  const response=await fetch(`https://www.nowgo.space/api/bookings?slug=${encodeURIComponent(slug)}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)return Response.json({error:'Reception unavailable'},{status:503,headers});
  const data=await response.json();
  if(typeof data.reservationsEnabled!=='boolean'||typeof data.waitingEnabled!=='boolean'||!Number.isSafeInteger(data.waitingCount)||data.waitingCount<0)throw new Error('Invalid response');
  return Response.json({reservationsEnabled:data.reservationsEnabled,waitingEnabled:data.waitingEnabled,waitingCount:data.waitingCount},{headers});
 }catch{return Response.json({error:'Reception unavailable'},{status:503,headers})}
}
