import HotSearchDirectory,{searchMetadata} from '@/components/hot-search-directory';
type Props={params:Promise<{region:string}>;searchParams:Promise<{page?:string}>};
export async function generateMetadata({params,searchParams}:Props){return searchMetadata({region:(await params).region,page:(await searchParams).page})}
export default async function Page({params,searchParams}:Props){return <HotSearchDirectory region={(await params).region} page={(await searchParams).page}/>}
