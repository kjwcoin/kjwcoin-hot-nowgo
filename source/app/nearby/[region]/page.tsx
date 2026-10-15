import {notFound} from 'next/navigation';
import HotSearchDirectory,{searchMetadata} from '@/components/hot-search-directory';
type Props={params:Promise<{region:string}>;searchParams:Promise<{page?:string}>};
function decodeRegion(region:string):string {
 // Next passes this dynamic segment URL-encoded. Decode once at the route boundary.
 try{return decodeURIComponent(region)}catch{notFound()}
}
export async function generateMetadata({params,searchParams}:Props){return searchMetadata({region:decodeRegion((await params).region),page:(await searchParams).page})}
export default async function Page({params,searchParams}:Props){return <HotSearchDirectory region={decodeRegion((await params).region)} page={(await searchParams).page}/>}
