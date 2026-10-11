import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'NOWGO SPACE',robots:{index:false,follow:false}};
export default function Page(){redirect('https://www.nowgo.space/flavors')}
