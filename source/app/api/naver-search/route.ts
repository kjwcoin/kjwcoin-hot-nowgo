import {naverHubSearch} from '@/lib/naver-hub';
import {reply} from '@/lib/server';
import {verifiedUser} from '@/lib/supabase';

export async function GET(req:Request){
 const auth=await verifiedUser(req);
 if(!auth)return reply(req,{error:'NOWGO 통합 로그인 후 검색할 수 있습니다.'},401);
 const url=new URL(req.url);
 const kind=url.searchParams.get('kind');
 const q=(url.searchParams.get('q')||'').trim();
 if(kind!=='local'&&kind!=='blog')return reply(req,{error:'지역 또는 블로그 검색을 선택해 주세요.'},400);
 if(q.length<2||q.length>70)return reply(req,{error:'검색어는 2~70자만 가능합니다.'},400);
 try{
  const data=await naverHubSearch(kind,q);
  return reply(req,{...data,notice:'검색 결과는 미검증 참고자료이며 매장 또는 메뉴 자동 등록이 아닙니다.'});
 }catch(e){
  console.error('NAVER API HUB lookup error',e instanceof Error?e.message:'unknown');
  return reply(req,{error:'네이버 검색 연결을 확인해 주세요.'},502);
 }
}
