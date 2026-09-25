import {EXPERIENCES,type ExperienceKey} from '@/lib/experience';
import Link from 'next/link';
export default function Brand({className='',experience='hot'}:{className?:string;experience?:ExperienceKey}) {
 return <Link className={`brand brand-logo ${className}`} href="/" aria-label={`${EXPERIENCES[experience].name} 메뉴 지도`}><img src={EXPERIENCES[experience].logo} alt="NOWGO" width={2173} height={724}/></Link>;
}
