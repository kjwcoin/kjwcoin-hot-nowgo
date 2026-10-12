'use client';
import Link from 'next/link';
export default function SourceStoreError({reset}:{reset:()=>void}){
 return <main className="terms-page"><h1>매장 자료를 불러오지 못했어요</h1><p>연결을 다시 확인해 주세요. 자료가 없는 매장으로 처리하지 않았습니다.</p><button className="submit-button" type="button" onClick={reset}>다시 확인</button><Link className="text-link" href="/">HOT 지도로 돌아가기</Link></main>;
}
