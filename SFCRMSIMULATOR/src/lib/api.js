let activeUser='u1';
export function setDemoUser(userId){activeUser=userId;}
export function getDemoUser(){return activeUser;}
export async function request(path,options={}){
 const response=await fetch('/api'+path,{
   ...options,
   headers:{'Content-Type':'application/json','x-demo-user':activeUser,...options.headers},
   body:options.body===undefined?undefined:typeof options.body==='string'?options.body:JSON.stringify(options.body)
 });
 const result=await response.json();
 if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);
 return result;
}
export const get=(path)=>request(path);
export const post=(path,payload)=>request(path,{method:'POST',body:payload});
export const patch=(path,payload)=>request(path,{method:'PATCH',body:payload});
export const del=(path)=>request(path,{method:'DELETE'});
