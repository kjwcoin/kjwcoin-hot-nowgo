'use client';
import RegularHomeLink from '@/components/regular-home-link';
import ActivityWorld from './activity-world';
import FlavorHeader from '@/components/flavor-header';
import {useActivity} from './use-activity';
import type {Planet} from '@/lib/activity/model';
import './activity.css';
export default function ActivityPage({planet,account=false}:{planet:Planet;account?:boolean}){const state=useActivity(planet,true);return <><FlavorHeader/><main className="aw-fullpage"><div className="aw-shell">{state.signedIn&&<nav className="aw-account-links" aria-label="계정 메뉴"><a href="/">메뉴 지도</a><RegularHomeLink>내 단골 목록</RegularHomeLink><a href="/exp-policy">EXP·레벨 정책</a>{account&&<a className="aw-account-withdraw" href="https://nowgo.space/account/withdraw">회원 탈퇴</a>}</nav>}<ActivityWorld planet={planet} state={state} account={account}/></div></main></>}
