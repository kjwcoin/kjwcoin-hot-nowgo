import HotSearchDirectory,{searchMetadata} from '@/components/hot-search-directory';
type Props={searchParams:Promise<{page?:string}>};
export async function generateMetadata({searchParams}:Props){return searchMetadata({page:(await searchParams).page})}
export default async function Page({searchParams}:Props){return <HotSearchDirectory page={(await searchParams).page}/>}
