import {env} from 'cloudflare:workers';
import {allMenus} from '@/lib/menu-catalog';
import {reply,failure} from '@/lib/server';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params;const menu=(await allMenus()).find(m=>m.placeId===id);if(!menu)return reply(req,{url:null},404);if(menu.isDemo)return reply(req,{url:null});
 // Only operator-confirmed per-store destinations. Never infer a review path or accept a client redirect.
 let mapping:Record<string,string>={};try{mapping=JSON.parse((env as unknown as Record<string,string>).NOWGO_REVIEW_URLS||'{}')}catch{}
 const raw=mapping[id];if(typeof raw!=='string')return reply(req,{url:null});
 try{const url=new URL(raw);if(url.protocol!=='https:'||!['nowgo.space','www.nowgo.space'].includes(url.hostname)||url.username||url.password||url.port||url.pathname==='/')return reply(req,{url:null});return reply(req,{url:url.toString()})}catch{return reply(req,{url:null})}
 }catch(e){return failure(req,e)}
}
