import {NextResponse,type NextRequest} from 'next/server';
export function proxy(request:NextRequest){
 if(/^(rich|sweet)\.nowgo\.space$/i.test(request.nextUrl.hostname)&&!/^\/(api|auth)(\/|$)/.test(request.nextUrl.pathname)){
  const target=new URL(request.nextUrl.pathname+request.nextUrl.search,'https://hot.nowgo.space');
  return NextResponse.redirect(target,307);
 }
 return NextResponse.next();
}
export const config={matcher:['/((?!_next|favicon.ico).*)']};
