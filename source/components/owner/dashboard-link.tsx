'use client';
import {useState} from 'react';
import styles from '@/components/owner-store-manager.module.css';
export default function DashboardLink({url}:{url?:string}){const [notice,setNotice]=useState('');async function copy(){try{await navigator.clipboard.writeText(url!);setNotice('고유 URL을 복사했습니다.')}catch{setNotice('주소를 선택해 복사해 주세요.')}}if(!url)return null;return <section className={styles.linkCard} aria-label="내 매장 고유 URL"><label>매장관리 전용 고유 URL<input value={url} readOnly aria-label="매장관리 전용 고유 URL" onFocus={e=>e.currentTarget.select()}/></label><button type="button" onClick={()=>void copy()}>고유 URL 복사</button><p>이 주소를 저장해 두세요. 로그인한 본인 매장만 관리할 수 있습니다.</p>{notice&&<p role="status">{notice}</p>}</section>}
