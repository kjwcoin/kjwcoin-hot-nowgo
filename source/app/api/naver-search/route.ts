import {reply} from '@/lib/server';

export async function GET(req:Request){
 // Keep stale clients and direct requests closed without auth or provider calls.
 return reply(req,{error:'네이버 검색 기능은 중단되었습니다.',code:'naver_search_disabled'},410);
}
