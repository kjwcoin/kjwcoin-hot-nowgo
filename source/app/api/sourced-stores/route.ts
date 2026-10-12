import {reply} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
import {readSourcedStoreFeed} from '@/lib/sourced-store-feed';
export async function GET(request:Request){
 if(variantForHost(request.headers.get('host'))!=='hot')return reply(request,{stores:[],asOf:new Date().toISOString(),complete:true});
 try{return reply(request,await readSourcedStoreFeed(request.signal))}
 catch{return reply(request,{error:'자료 매장을 불러오지 못했어요.',complete:false},503)}
}
