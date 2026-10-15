import type {SourceFeedState} from '@/hooks/use-sourced-stores';
export default function SourcedStoreNotice({state,retry}:{state:SourceFeedState;retry:()=>void}){
 if(state.status==='ready'&&state.feed?.complete)return null;
 return <p className="sourced-store-notice" role="status">{state.status==='loading'?'공공자료 매장을 불러오는 중이에요.':state.status==='error'?'공공자료 매장을 불러오지 못했어요. 현재 목록이 전체 매장은 아니에요.':'공공자료 매장 일부만 확인했어요. 전체 매장 수와 다를 수 있어요.'}{state.status==='error'&&<button type="button" onClick={retry}>다시 확인</button>}</p>;
}
