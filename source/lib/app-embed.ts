export const APP_PARENT_ORIGIN='https://nowgo-planet-iphone.workspace-948032.chatgpt.site';
export const isAppLoginChannel=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export function appParentOrigin(){if(typeof document==='undefined')return APP_PARENT_ORIGIN;try{const origin=new URL(document.referrer).origin;if(['https://www.nowgo.space','https://nowgo.space','https://hot.nowgo.space','https://rich.nowgo.space','https://sweet.nowgo.space'].includes(origin))return origin}catch{}return APP_PARENT_ORIGIN}
export function postAppEvent(payload:Record<string,unknown>){
 if(typeof window==='undefined')return;
 window.dispatchEvent(new CustomEvent('nowgo:app-event',{detail:payload}));
 if(window.parent!==window){window.parent.postMessage(payload,appParentOrigin())}
 const bridge=(window as unknown as {webkit?:{messageHandlers?:{nowgo?:{postMessage:(data:unknown)=>void}}}}).webkit?.messageHandlers?.nowgo;
 bridge?.postMessage(payload);
}
