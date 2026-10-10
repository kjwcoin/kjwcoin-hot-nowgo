import type {Metadata} from 'next';
import {headers} from 'next/headers';
import AppEntry from '@/components/app-entry';
import {variantForHost} from '@/lib/site-config';
import './entry.css';
export const metadata:Metadata={title:'NOWGO 통합회원 로그인',robots:{index:false,follow:false}};
export default async function Page(){return <AppEntry variant={variantForHost((await headers()).get('host'))}/>}
