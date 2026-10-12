// Short-lived abuse protection only; no queries or search results are stored here.
const WINDOW_MS=60_000,USER_LIMIT=10,INSTANCE_LIMIT=100;
const requests=new Map<string,{count:number;expires:number}>();
let globalWindow={count:0,expires:0};
export function allowNaverSearch(userId:string,now=Date.now()):boolean{
 if(now>=globalWindow.expires){globalWindow={count:0,expires:now+WINDOW_MS};requests.clear()}
 if(globalWindow.count>=INSTANCE_LIMIT)return false;
 const user=requests.get(userId)||{count:0,expires:now+WINDOW_MS};
 if(now>=user.expires){user.count=0;user.expires=now+WINDOW_MS}
 if(user.count>=USER_LIMIT)return false;
 user.count++;globalWindow.count++;requests.set(userId,user);return true;
}
