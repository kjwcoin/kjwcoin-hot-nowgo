import {naverHubSearch,NaverSearchUnavailable} from '@/lib/naver-hub';
import {allowNaverSearch} from '@/lib/naver-search-limit';
import {reply} from '@/lib/server';
import {verifiedUser} from '@/lib/supabase';

export async function GET(req:Request){
 try{
  const auth=await verifiedUser(req);
  if(!auth)return reply(req,{error:'NOWGO 통합 로그인 후 검색할 수 있습니다.'},401);
  const url=new URL(req.url),kind=url.searchParams.get('kind'),q=(url.searchParams.get('q')||'').trim();
  if(kind!=='local'&&kind!=='blog')return reply(req,{error:'지역 또는 블로그 검색을 선택해 주세요.'},400);
  if(q.length<2||q.length>70)return reply(req,{error:'검색어는 2~70자만 가능합니다.'},400);
  if(!allowNaverSearch(auth.user.id))return reply(req,{error:'검색 요청이 많아요. 잠시 후 다시 검색해 주세요.'},429);
  const data=await naverHubSearch(kind,q);
  return reply(req,{...data,notice:'NAVER 검색 참고자료입니다. 매운 메뉴·사진 사용 권한·가격·영업 상태를 확인한 HOT 등록 매장 목록이 아닙니다.'});
 }catch(error){
  if(error instanceof NaverSearchUnavailable&&error.code==='not_configured')return reply(req,{error:'네이버 검색 연결을 준비하고 있어요.',code:'naver_not_configured'},503);
  // Never log upstream bodies, request headers, keys, or search queries.
  return reply(req,{error:'네이버 검색을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',code:'naver_unavailable'},502);
 }
}
