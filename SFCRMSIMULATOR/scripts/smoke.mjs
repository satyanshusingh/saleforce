const url=process.env.API_BASE||'http://127.0.0.1:4100';
const tests=[['Health','/api/health'],['Objects','/api/metadata'],['Dashboard','/api/overview'],['Leads','/api/leads'],['Contacts','/api/contacts'],['Flows','/api/workflows']];
let failed=0;
for(const [name,path] of tests){try{const r=await fetch(url+path);const x=await r.json();if(!r.ok)throw Error(x.error||String(r.status));console.log('PASS',name)}catch(e){failed++;console.log('FAIL',name,e.message)}}
if(failed)process.exitCode=1;
