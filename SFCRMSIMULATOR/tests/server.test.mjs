import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'crm-enterprise-test-'));
process.env.CRM_DB_PATH=join(dir,'crm.json');
process.env.NODE_ENV='test';
const {server}=await import('../server/server.mjs');
const {evaluateSlaBreaches}=await import('../server/engine.mjs');
let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`});
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true})});
async function call(path,{method='GET',body,user='u1'}={}){
 const r=await fetch(base+'/api'+path,{method,headers:{'content-type':'application/json','x-demo-user':user},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};
}
beforeEach(async()=>{if(base){const x=await call('/reset',{method:'POST'});assert.equal(x.status,200)}});
test('health and seed object counts',async()=>{const res=await call('/health');assert.equal(res.status,200);assert.equal(res.data.objects.contacts,5);assert.equal(res.data.objects.leads,6)});
test('lead conversion requires qualification and creates linked records and task',async()=>{
 const lead=await call('/leads',{method:'POST',body:{FirstName:'Isha',LastName:'Patil',Company:'Delta Robotics',Email:'isha@example.com'}});assert.equal(lead.status,201);
 const err=await call(`/leads/${lead.data.Id}/convert`,{method:'POST',body:{}});assert.equal(err.status,400);
 await call(`/leads/${lead.data.Id}`,{method:'PATCH',body:{Status:'Qualified'}});
 const convert=await call(`/leads/${lead.data.Id}/convert`,{method:'POST',body:{createOpportunity:true}});
 assert.equal(convert.status,200);assert.equal(convert.data.Lead.Status,'Converted');assert.equal(convert.data.Contact.AccountId,convert.data.Account.Id);
 assert.equal(convert.data.Opportunity.AccountId,convert.data.Account.Id);
 const tasks=await call('/tasks');assert.ok(tasks.data.some(t=>t.Subject.includes('Welcome call')));
 const flows=await call('/workflows');assert.ok(flows.data.runs.some(r=>r.name==='Lead qualification follow-up'));
});
test('lead conversion reuses a matching Account and cannot run twice',async()=>{
 const lead=await call('/leads',{method:'POST',body:{LastName:'Reuse',Company:' aurora technologies ',Email:'reuse@example.com',Status:'Qualified'}});
 assert.equal(lead.status,201);
 const conversion=await call(`/leads/${lead.data.Id}/convert`,{method:'POST',body:{}});
 assert.equal(conversion.data.reusedAccount,true);
 assert.equal(conversion.data.Account.Id,'001000000000000001');
 assert.equal(conversion.data.Contact.AccountId,conversion.data.Account.Id);
 assert.equal(conversion.data.Opportunity.AccountId,conversion.data.Account.Id);
 assert.ok(conversion.data.conversionDate);
 const duplicate=await call(`/leads/${lead.data.Id}/convert`,{method:'POST',body:{}});
 assert.equal(duplicate.status,400);
 assert.match(duplicate.data.error,/already been converted/i);
});
test('contact validation prevents bad email and duplicate contact',async()=>{
 const bad=await call('/contacts',{method:'POST',body:{LastName:'Patel',Email:'bad-at-example'}});assert.equal(bad.status,400);assert.match(bad.data.error,/email/i);
 const dup=await call('/contacts',{method:'POST',body:{LastName:'Rao',Email:'ananya@example.com'}});assert.equal(dup.status,400);assert.match(dup.data.error,/Duplicate/i);
});
test('role and record and field restrictions are enforced on server',async()=>{
 const noLeads=await call('/leads',{user:'u4'});assert.equal(noLeads.status,403);
 const repAccounts=await call('/accounts',{user:'u2'});assert.equal(repAccounts.status,200);assert.ok(!('AnnualRevenue' in repAccounts.data[0]));
 const adminAccounts=await call('/accounts');assert.ok('AnnualRevenue' in adminAccounts.data[0]);
 const managerLead='00Q000000000000004';const change=await call('/leads/'+managerLead,{method:'PATCH',user:'u2',body:{Status:'Working'}});assert.equal(change.status,403);
});
test('High-priority Case automatically escalates and creates task',async()=>{
 const c=await call('/cases',{method:'POST',user:'u4',body:{Subject:'Urgent connectivity issue',Priority:'Critical',Status:'New'}});assert.equal(c.status,201);
 const tasks=await call('/tasks',{user:'u4'});const escalations=tasks.data.filter(x=>x.EscalationForCaseId===c.data.Id);
 assert.equal(escalations.length,1);assert.equal(escalations[0].OwnerId,'u4');
 assert.equal(c.data.EscalationStatus,'Open');
 await call(`/cases/${c.data.Id}`,{method:'PATCH',user:'u4',body:{Priority:'High'}});
 const afterUpdate=await call('/tasks',{user:'u4'});assert.equal(afterUpdate.data.filter(x=>x.EscalationForCaseId===c.data.Id).length,1);
 const runs=await call('/workflows');assert.ok(runs.data.runs.some(x=>x.triggerId===c.data.Id));
});
test('Opportunity Closed Won requires manager approval and produces onboarding task',async()=>{
 const id='006000000000000002';
 const rejected=await call(`/opportunities/${id}`,{method:'PATCH',body:{StageName:'Closed Won'},user:'u2'});
 assert.equal(rejected.status,400);assert.match(rejected.data.error,/approval/i);
 const requested=await call(`/opportunities/${id}/approval`,{method:'POST',body:{decision:'request'},user:'u2'});
 assert.equal(requested.data.ApprovalStatus,'Pending');
 const denied=await call(`/opportunities/${id}/approval`,{method:'POST',body:{decision:'approve'},user:'u2'});
 assert.equal(denied.status,403);
 const approved=await call(`/opportunities/${id}/approval`,{method:'POST',body:{decision:'approve'},user:'u3'});
 assert.equal(approved.data.ApprovalStatus,'Approved');
 const changed=await call(`/opportunities/${id}`,{method:'PATCH',body:{StageName:'Closed Won'},user:'u2'});
 assert.equal(changed.data.Probability,100);
 const tasks=await call('/tasks');assert.ok(tasks.data.some(x=>x.RelatedToId===id&&x.Subject.startsWith('Begin onboarding')));
 const history=await call(`/opportunities/${id}/history`,{user:'u2'});
 assert.ok(history.data.some(x=>x.approvalStatus==='Approved'));
 assert.ok(history.data.some(x=>x.toStage==='Closed Won'));
});
test('Resolved Cases require a date and close their escalation task',async()=>{
 const created=await call('/cases',{method:'POST',user:'u4',body:{Subject:'Critical outage',Priority:'Critical'}});
 assert.equal(created.status,201);
 const missingDate=await call(`/cases/${created.data.Id}`,{method:'PATCH',user:'u4',body:{Status:'Resolved'}});
 assert.equal(missingDate.status,400);assert.match(missingDate.data.error,/ResolutionDate/);
 const resolved=await call(`/cases/${created.data.Id}`,{method:'PATCH',user:'u4',body:{Status:'Resolved',ResolutionDate:new Date().toISOString().slice(0,10)}});
 assert.equal(resolved.data.EscalationStatus,'Closed');
 const tasks=await call('/tasks',{user:'u4'});
 const task=tasks.data.find(x=>x.EscalationForCaseId===created.data.Id);
 assert.equal(task.Status,'Completed');assert.equal(task.CompletedById,'u4');assert.ok(task.CompletedAt);
 const reopen=await call(`/tasks/${task.Id}`,{method:'PATCH',user:'u4',body:{Status:'Not Started'}});
 assert.equal(reopen.status,400);
 const history=await call(`/cases/${created.data.Id}/escalation-history`,{user:'u4'});
 assert.ok(history.data.some(x=>x.action==='ESCALATION_CREATED'));
 assert.ok(history.data.some(x=>x.action==='ESCALATION_CLOSED'));
});
test('Customer 360 returns related records with server-side pagination',async()=>{
 const response=await call('/accounts/001000000000000001/360?tab=contacts&page=1&pageSize=1');
 assert.equal(response.status,200);
 assert.equal(response.data.account.Name,'Aurora Technologies');
 assert.equal(response.data.relatedCounts.contacts,2);
 assert.equal(response.data.total,2);assert.equal(response.data.pageCount,2);
 assert.equal(response.data.rows.length,1);
});
test('Account email and AccountNumber are validated',async()=>{
 const bad=await call('/accounts',{method:'POST',body:{Name:'Bad account',Email:'bad-email'}});
 assert.equal(bad.status,400);assert.match(bad.data.error,/email/i);
 const duplicate=await call('/accounts',{method:'POST',body:{Name:'Duplicate account number',AccountNumber:'AC-000001'}});
 assert.equal(duplicate.status,400);assert.match(duplicate.data.error,/unique/i);
});
test('Critical and High cases notify managers at the configured SLA limits',async()=>{
 const critical=await call('/cases',{method:'POST',user:'u4',body:{Subject:'Critical SLA test',Priority:'Critical'}});
 const high=await call('/cases',{method:'POST',user:'u4',body:{Subject:'High SLA test',Priority:'High'}});
 const criticalAt=Date.parse(critical.data.EscalatedAt),highAt=Date.parse(high.data.EscalatedAt);
 evaluateSlaBreaches(criticalAt+5*60*60*1000);
 let notifications=await call('/notifications',{user:'u3'});
 assert.ok(notifications.data.some(x=>x.recordId===critical.data.Id&&x.type==='case-sla-breach'));
 assert.ok(!notifications.data.some(x=>x.recordId===high.data.Id&&x.type==='case-sla-breach'));
 evaluateSlaBreaches(highAt+25*60*60*1000);
 notifications=await call('/notifications',{user:'u3'});
 assert.ok(notifications.data.some(x=>x.recordId===high.data.Id&&x.type==='case-sla-breach'));
});
test('relationship restrictions prevent account deletion',async()=>{
 const r=await call('/accounts/001000000000000001',{method:'DELETE'});assert.equal(r.status,400);assert.match(r.data.error,/related records/i);
});
test('GraphQL selection sets return edges node value and count',async()=>{
 const query=`query Contacts {uiapi {query {Contact(first: 2) {totalCount edges {node {Id LastName {value} Email {value}}}}}}}`;
 const res=await call('/graphql',{method:'POST',body:{query}});
 assert.equal(res.status,200);assert.equal(res.data.data.uiapi.query.Contact.totalCount,5);
 assert.equal(res.data.data.uiapi.query.Contact.edges.length,2);
 assert.ok(typeof res.data.data.uiapi.query.Contact.edges[0].node.LastName.value==='string');
 assert.ok(!('Phone' in res.data.data.uiapi.query.Contact.edges[0].node));
});
test('GraphQL mutation with variables creates a Contact',async()=>{
 const query=`mutation CreateContact($input: ContactCreateInput!) {uiapi {ContactCreate(input:$input){Record{Id FirstName{value} LastName{value}} success}}}`;
 const res=await call('/graphql',{method:'POST',body:{query,variables:{input:{Contact:{FirstName:'Dev',LastName:'Trainer',Email:'trainer@example.com'}}}}});
 assert.equal(res.data.data.uiapi.ContactCreate.Record.LastName.value,'Trainer');
 assert.equal(res.data.data.uiapi.ContactCreate.success,true);
});
test('GraphQL field security reports errors rather than exposing annual revenue',async()=>{
 const query=`query A{uiapi{query{Account(first:3){edges{node{Id Name{value} AnnualRevenue{value}}}}}}}`;
 const res=await call('/graphql',{method:'POST',user:'u2',body:{query}});
 assert.equal(res.data.data,null);assert.match(res.data.errors[0].message,/Field-level security/);
});
test('audit limited to managers and administrators',async()=>{
 const unauthorized=await call('/audit',{user:'u2'});assert.equal(unauthorized.status,403);
 await call('/leads',{method:'POST',body:{LastName:'Test',Company:'Example Inc'}});
 const authorized=await call('/audit');assert.ok(authorized.data.find(x=>x.operation==='CREATE'));
});
