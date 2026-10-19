import {reply} from '@/lib/server';

// Retain main's shutdown policy: do not call an external NAVER provider or
// treat a third-party search result as licensed store/menu evidence.
// Public HOT menu search is handled by /api/menus, not this retired endpoint.
export async function GET(req:Request){
 return reply(req,{error:'네이버 검색 기능은 중단되었습니다.',code:'naver_search_disabled'},410);
}
