export const APP_PARENT_ORIGIN='https://nowgo-planet-iphone.workspace-948032.chatgpt.site';
export const isAppLoginChannel=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export function postAppEvent(payload:Record<string,unknown>){
 if(typeof window==='undefined')return;
 if(window.parent!==window)window.parent.postMessage(payload,APP_PARENT_ORIGIN);
 const bridge=(window as unknown as {webkit?:{messageHandlers?:{nowgo?:{postMessage:(data:unknown)=>void}}}}).webkit?.messageHandlers?.nowgo;
 bridge?.postMessage(payload);
}
