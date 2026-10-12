'use client';
import {useState} from 'react';
import Link from 'next/link';
import {api} from '@/lib/client';
import '@/components/hot-ad-manager.css';
export default function AdPayment(){const [message,setMessage]=useState('결제 승인과 광고 연결을 확인해 주세요.'),[busy,setBusy]=useState(false);async function confirm(){setBusy(true);try{const p=new URLSearchParams(location.search);if(p.get('code'))throw Error('결제를 완료하지 않았습니다. 광고 신청 화면에서 다시 시도해 주세요.');const result=await api<{message:string}>('/api/hot-ads/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'confirm',bidId:p.get('bid'),paymentId:p.get('paymentId')})});setMessage(result.message);history.replaceState(null,'','/advertise/payment');}catch(e){setMessage(e instanceof Error?e.message:'결제를 다시 확인해 주세요.')}finally{setBusy(false)}}return <main className="hot-ad-page"><h1>광고 결제 확인</h1><p role="status">{message}</p><button className="ad-primary" disabled={busy} onClick={()=>void confirm()}>{busy?'확인 중':'결제 결과 확인 / 재확인'}</button><p><Link href="/advertise">내 광고 신청 상태로</Link></p></main>}
