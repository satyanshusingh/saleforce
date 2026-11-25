import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {CRMError,currentUser,getAll,getOne,create,update,remove,convertLead,updateOpportunityApproval,getOpportunityHistory,getCaseEscalationHistory,getAccount360,getNotifications,markNotificationRead,stats,getAudit,getFlows,getSecurity,getMeta,reset,dbHealth} from './engine.mjs';
import {handleGraphQL,EXAMPLES} from './graphql-lab.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||4100);
const corsHeaders={'Access-Control-Allow-Origin':'http://127.0.0.1:5173','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,x-demo-user','Cache-Control':'no-store'};
function send(res,status,body,type='application/json'){res.writeHead(status,{'Content-Type':type,...corsHeaders});res.end(type==='application/json'?JSON.stringify(body):body);}
const readBody=req=>new Promise((resolve,reject)=>{let body='';req.on('data',x=>{body+=x;if(body.length>1024*1024){reject(new CRMError('Request exceeds 1 MB',413));req.destroy();}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch{reject(new CRMError('Invalid JSON body'));}});req.on('error',reject);});
function servePublic(res,path){const file=join(here,'public',path==='/'?'index.html':path.slice(1));const dir=resolve(here,'public');if(!resolve(file).startsWith(dir)||!existsSync(file))return send(res,404,{error:'Resource not found'});const ext=file.split('.').pop(),mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'}[ext]||'text/plain';send(res,200,readFileSync(file,'utf8'),mime);}
export const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS')return send(res,204,{});
 try{
  const u=new URL(req.url,'http://localhost');const parts=u.pathname.split('/').filter(Boolean),user=currentUser(req.headers['x-demo-user']||'u1');
  if(parts[0]!=='api'){if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});return servePublic(res,u.pathname);}
  const path=parts[1],id=parts[2];
  if(path==='health'&&req.method==='GET')return send(res,200,dbHealth());
  if(path==='session'&&req.method==='GET')return send(res,200,{user,availableUsers:getMeta().users});
  if(path==='metadata'&&req.method==='GET')return send(res,200,getMeta());
  if(path==='overview'&&req.method==='GET')return send(res,200,stats(user));
  if(path==='security'&&req.method==='GET')return send(res,200,getSecurity(user));
  if(path==='workflows'&&req.method==='GET')return send(res,200,getFlows(user));
  if(path==='audit'&&req.method==='GET')return send(res,200,getAudit(user));
  if(path==='notifications'&&req.method==='GET')return send(res,200,getNotifications(user));
  if(path==='notifications'&&id&&req.method==='PATCH')return send(res,200,markNotificationRead(user,id));
  if(path==='graphql-examples'&&req.method==='GET')return send(res,200,EXAMPLES);
  if(path==='graphql'&&req.method==='POST')return send(res,200,handleGraphQL(user,await readBody(req)));
  if(path==='reset'&&req.method==='POST')return send(res,200,reset(user));
  if(path==='leads'&&id&&parts[3]==='convert'&&req.method==='POST')return send(res,200,convertLead(user,id,await readBody(req)));
  if(path==='accounts'&&id&&parts[3]==='360'&&req.method==='GET')return send(res,200,getAccount360(user,id,Object.fromEntries(u.searchParams)));
  if(path==='opportunities'&&id&&parts[3]==='approval'&&req.method==='POST')return send(res,200,updateOpportunityApproval(user,id,await readBody(req)));
  if(path==='opportunities'&&id&&parts[3]==='history'&&req.method==='GET')return send(res,200,getOpportunityHistory(user,id));
  if(path==='cases'&&id&&parts[3]==='escalation-history'&&req.method==='GET')return send(res,200,getCaseEscalationHistory(user,id));
  if(['leads','contacts','accounts','opportunities','cases','tasks'].includes(path)){
    if(req.method==='GET')return send(res,200,id?getOne(user,path,id):getAll(user,path,Object.fromEntries(u.searchParams)));
    if(!id&&req.method==='POST')return send(res,201,create(user,path,await readBody(req)));
    if(id&&req.method==='PATCH')return send(res,200,update(user,path,id,await readBody(req)));
    if(id&&req.method==='DELETE')return send(res,200,remove(user,path,id));
  }
  return send(res,404,{error:'Unknown API endpoint',route:u.pathname});
 }catch(e){return send(res,e.status||500,{error:e.message||'Unexpected server error',type:e instanceof CRMError?'CRMError':'ServerError'});}
});
if(process.env.NODE_ENV!=='test')server.listen(PORT,'127.0.0.1',()=>console.log(`\nCloudBridge CRM classroom API: http://127.0.0.1:${PORT}\nOffline demo UI: http://127.0.0.1:${PORT}/\nReact UI (after npm install): http://127.0.0.1:5173\n`));
