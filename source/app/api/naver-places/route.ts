import {verifiedUser} from '@/lib/supabase';
import {reply} from '@/lib/server';
import {naverPlace} from '@/lib/naver-places';
export async function GET(request:Request){
 if(!await verifiedUser(request))return reply(request,{error:'로그인 후 매장을 검색해 주세요.'},401);
 const query=new URL(request.url).searchParams.get('q')?.trim()||'';
 if(query.length<2||query.length>80)return reply(request,{error:'지역과 매장 이름을 입력해 주세요.'},400);
 const id=process.env.NAVER_SEARCH_CLIENT_ID,secret=process.env.NAVER_SEARCH_CLIENT_SECRET;
 if(!id||!secret)return reply(request,{error:'네이버 매장 검색 연결을 준비 중입니다. 직접 입력과 주소 검색을 이용해 주세요.',code:'naver_not_configured'},503);
 try{
  const url=new URL('https://openapi.naver.com/v1/search/local.json');url.searchParams.set('query',query);url.searchParams.set('display','5');url.searchParams.set('start','1');
  const response=await fetch(url,{headers:{'X-Naver-Client-Id':id,'X-Naver-Client-Secret':secret},signal:AbortSignal.timeout(5000),next:{revalidate:600}});
  if(!response.ok)throw Error('upstream_unavailable');
  const data=await response.json();return reply(request,{places:(Array.isArray(data.items)?data.items:[]).map(naverPlace).filter(Boolean),notice:'네이버 지역검색 정보입니다. 메뉴·사진·가격·고추 표시·매운맛·영업상태는 API에서 제공되지 않아 직접 확인해야 합니다.'});
 }catch{return reply(request,{error:'네이버 검색을 불러오지 못했습니다. 직접 입력해 주세요.'},503);}
}
