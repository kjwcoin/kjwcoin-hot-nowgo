'use client';
import ActivityWorld from './activity-world';
import {useActivity} from './use-activity';
import type {Planet} from '@/lib/activity/model';
import './activity.css';
export default function ActivityPage({planet}:{planet:Planet}){const state=useActivity(planet);return <main className="aw-fullpage"><div className="aw-shell"><nav className="aw-shell-header"><img className="aw-logo" src="/activity/nowgo-white.png" alt="나우고" width="112" height="38"/><a href="/">지도 탐험으로 돌아가기 ↗</a></nav><ActivityWorld planet={planet} state={state}/></div></main>}
