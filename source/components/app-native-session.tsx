'use client';
import {useEffect} from 'react';
import {browserDb} from '@/lib/supabase-browser';
export default function AppNativeSession(){
 useEffect(()=>{let active=true;const receive=async(event:Event)=>{const bridge=(window as unknown as {webkit?:{messageHandlers?:{nowgo?:unknown}}}).webkit?.messageHandlers?.nowgo;if(!bridge)return;const detail=(event as CustomEvent).detail;if(typeof detail?.access_token!=='string'||typeof detail?.refresh_token!=='string'||detail.access_token.length>20000||detail.refresh_token.length>20000)return;const {error}=await browserDb().auth.setSession({access_token:detail.access_token,refresh_token:detail.refresh_token});if(!error&&active)window.dispatchEvent(new Event('hot-customer-change'))};window.addEventListener('nowgo:native-session',receive);return()=>{active=false;window.removeEventListener('nowgo:native-session',receive)}},[]);return null;
}
