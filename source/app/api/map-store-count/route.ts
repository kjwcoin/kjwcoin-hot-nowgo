import {reply} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
import {InvalidViewportCountQuery,parseViewportCountParams,viewportStoreCount} from '@/lib/viewport-store-count';

export async function GET(req:Request){
 try{
  const variant=variantForHost(req.headers.get('host'));
  const input=parseViewportCountParams(new URL(req.url).searchParams,variant);
  return reply(req,await viewportStoreCount(input,variant,req.signal));
 }catch(error){
  const invalid=error instanceof InvalidViewportCountQuery;
  return reply(req,{count:null,complete:false,scope:'viewport',error:invalid?'지도 범위와 검색 조건을 확인해 주세요.':'지금 이 영역의 등록 매장 수를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.'},invalid?400:503);
 }
}
