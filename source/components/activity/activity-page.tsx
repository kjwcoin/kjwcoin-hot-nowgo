'use client';
import ActivityWorld from './activity-world';
import FlavorHeader from '@/components/flavor-header';
import {useActivity} from './use-activity';
import type {Planet} from '@/lib/activity/model';
import './activity.css';
export default function ActivityPage({planet}:{planet:Planet}){const state=useActivity(planet);return <><FlavorHeader/><main className="aw-fullpage"><div className="aw-shell"><ActivityWorld planet={planet} state={state}/></div></main></>}
