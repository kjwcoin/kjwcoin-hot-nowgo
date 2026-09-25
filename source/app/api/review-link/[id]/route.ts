import {menuByPlaceId} from '@/lib/menu-catalog';
import {reply,failure} from '@/lib/server';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params,menu=await menuByPlaceId(id);
  if(!menu)return reply(req,{url:null},404);
  if(menu.isDemo)return reply(req,{url:null});
  if(menu.nowgoSlug&&/^[a-zA-Z0-9_-]{1,100}$/.test(menu.nowgoSlug))return reply(req,{url:`https://www.nowgo.space/p/${menu.nowgoSlug}?source=sweet`});
  let mapping:Record<string,string>={};try{mapping=JSON.parse(process.env.NOWGO_REVIEW_URLS||'{}')}catch{}
  const raw=mapping[id];if(typeof raw!=='string')return reply(req,{url:null});
  try{const url=new URL(raw);if(url.protocol!=='https:'||!['nowgo.space','www.nowgo.space'].includes(url.hostname)||url.username||url.password||url.port||url.pathname==='/')return reply(req,{url:null});return reply(req,{url:url.toString()})}catch{return reply(req,{url:null})}
 }catch(e){return failure(req,e)}
}
