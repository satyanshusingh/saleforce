// Demonstration script: backend must already be running.
// Uses invented example.com identities only. Adds records to local teaching data.
const base=process.env.API_BASE||'http://127.0.0.1:4100';
const headers={'content-type':'application/json','x-demo-user':'u1'};
async function req(path,method='GET',body){const r=await fetch(base+'/api'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});const json=await r.json();if(!r.ok)throw Error(json.error);return json;}
try{
 const suffix=Math.floor(Date.now()%100000);
 const lead=await req('/leads','POST',{FirstName:'Priya',LastName:'Demo',Company:'Nova Robotics '+suffix,Email:`priya.demo${suffix}@example.com`,Status:'Qualified',LeadSource:'Webinar',Rating:'Hot'});
 console.log('1. Qualified Lead created:',lead.Id,lead.Company);
 const conversion=await req('/leads/'+lead.Id+'/convert','POST',{createOpportunity:true});
 console.log('2. Converted → Account:',conversion.Account.Id,'Contact:',conversion.Contact.Id,'Opportunity:',conversion.Opportunity.Id);
 const won=await req('/opportunities/'+conversion.Opportunity.Id,'PATCH',{StageName:'Closed Won',Amount:125000});
 console.log('3. Opportunity moved to',won.StageName,'with Probability',won.Probability);
 const caseRecord=await req('/cases','POST',{Subject:'Critical integration issue for '+conversion.Account.Name,AccountId:conversion.Account.Id,ContactId:conversion.Contact.Id,Priority:'Critical',Status:'New',Origin:'Web'});
 console.log('4. Critical Case created:',caseRecord.Id,'CaseNumber:',caseRecord.CaseNumber);
 const tasks=await req('/tasks');
 console.log('5. Related tasks:',tasks.filter(t=>[lead.Id,conversion.Contact.Id,won.Id,caseRecord.Id].includes(t.RelatedToId)).map(t=>t.Subject));
 const runs=await req('/workflows');console.log('6. Automation events:',runs.runs.length);
 console.log('\nOpen http://127.0.0.1:5173 to inspect records and dashboards.');
}catch(e){console.error('Demo scenario failed:',e.message);process.exitCode=1;}
