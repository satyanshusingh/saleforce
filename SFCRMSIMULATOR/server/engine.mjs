import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {OBJECTS,USERS,ROLE_PERMISSIONS,STAGE_PROBABILITIES,WORKFLOWS} from './model.mjs';
import {seed} from './seed.mjs';

const dbPath = resolve(process.env.CRM_DB_PATH||'server/data/crm.json');
let db;
function persist(){mkdirSync(dirname(dbPath),{recursive:true});const tmp=dbPath+'.tmp';writeFileSync(tmp,JSON.stringify(db,null,2),'utf8');renameSync(tmp,dbPath);}
function load(){if(!db){db=existsSync(dbPath)?JSON.parse(readFileSync(dbPath,'utf8')):seed();ensureDataShape();persist();}return db;}
export class CRMError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const err=(message,status=400)=>{throw new CRMError(message,status);};
const SUPPORT_TEAM_ID='u4';
const SYSTEM_ACTOR={Id:'system',Name:'CRM Automation',Role:'Administrator'};
const CLOSED_CASE_STATUSES=['Resolved','Closed'];
const OPPORTUNITY_STAGES=['Prospecting','Qualification','Discovery','Proposal','Negotiation','Closed Won'];
export const userById=id=>USERS.find(x=>x.Id===id);
export function currentUser(id){const user=userById(id);if(!user)err('Unknown classroom persona',400);return user;}
export function can(user,obj,verb){return !!ROLE_PERMISSIONS[user.Role]?.[obj]?.includes(verb);}
export function checkObject(user,obj,verb){if(!OBJECTS[obj])err('Unknown Salesforce-style object: '+obj,404);if(!can(user,obj,verb))err(`${user.Role} does not have ${verb} permission on ${OBJECTS[obj].singular}`,403);}
function checkOwner(user,obj,row,verb){
  if(user.Role==='Administrator'||user.Role==='Sales Manager')return;
  if(user.Role==='Sales Representative') {
    if((obj==='leads'||obj==='opportunities')&&row.OwnerId!==user.Id)err('Record sharing: this record is not owned by you',403);
    if(verb!=='R'&&row.OwnerId!==user.Id)err('Record edit access denied: another owner',403);
  }
  if(user.Role==='Support Agent'&&obj==='cases'&&row.OwnerId!==user.Id)err('Case queue sharing denied',403);
  if(user.Role==='Support Agent'&&obj==='tasks'&&verb!=='R'&&row.OwnerId!==user.Id)err('Task ownership restriction',403);
}
function visible(user,obj,row){try{checkOwner(user,obj,row,'R');return true;}catch{return false;}}
const HIDDEN_FIELDS={'Sales Representative':{accounts:['AnnualRevenue']},'Support Agent':{accounts:['AnnualRevenue']}};
export function fieldAllowed(user,obj,field){return !(HIDDEN_FIELDS[user.Role]?.[obj]||[]).includes(field);}
export function sanitize(user,obj,row){if(!row)return null;let out={};for(const [k,v] of Object.entries(row))if(fieldAllowed(user,obj,k))out[k]=v;return out;}
export function getAll(user,obj,opts={}){
  load();checkObject(user,obj,'R');
  let a=db[obj].filter(r=>visible(user,obj,r)).map(r=>sanitize(user,obj,r));
  const q=String(opts.q||'').trim().toLowerCase();
  if(q)a=a.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(q)));
  const sort=opts.sort||'LastModifiedDate';
  const direction=opts.dir==='asc'?1:-1;
  if(a.length&&Object.hasOwn(a[0],sort))a.sort((x,y)=>String(x[sort]??'').localeCompare(String(y[sort]??''))*direction);
  return a;
}
export function getOne(user,obj,id){load();checkObject(user,obj,'R');const r=db[obj].find(x=>x.Id===id);if(!r)err('Record not found',404);checkOwner(user,obj,r,'R');return sanitize(user,obj,r);}
function stamp(){return new Date().toISOString();}
function addId(obj){return OBJECTS[obj].prefix+randomBytes(8).toString('hex').slice(0,15).toUpperCase();}
function defaults(obj,x){
 const d={
  leads:{Status:'New',Rating:'Warm',LeadSource:'Website'},
  accounts:{Status:'Active'},
  opportunities:{StageName:'Prospecting',Amount:0,ApprovalStatus:'Not Submitted'},
  cases:{Status:'New',Priority:'Medium',Origin:'Web',EscalationStatus:'Closed'},
  tasks:{Status:'Not Started',Priority:'Normal'}
 }[obj]||{};
 return {...d,...x};
}
function ensureDataShape(){
 db.audit ||= [];
 db.workflowRuns ||= [];
 if(!Array.isArray(db.activities)||db.activities.length===0)db.activities=[...db.audit];
 db.notifications ||= [];
 db.opportunityHistory ||= [];
 db.caseEscalationHistory ||= [];
 for(let i=0;i<db.accounts.length;i++){
  const account=db.accounts[i];
  account.AccountNumber ||= `AC-${String(i+1).padStart(6,'0')}`;
  account.Status ||= 'Active';
 }
 for(const opportunity of db.opportunities){
  opportunity.ApprovalStatus ||= opportunity.StageName==='Closed Won'?'Approved':'Not Submitted';
  opportunity.Probability ??= STAGE_PROBABILITIES[opportunity.StageName]??10;
  if(opportunity.StageName==='Closed Won'){
   opportunity.ApprovedById ||= 'u3';
   opportunity.ApprovedAt ||= opportunity.LastModifiedDate||stamp();
  }
 }
 for(const record of db.cases){
  if(CLOSED_CASE_STATUSES.includes(record.Status)){
   record.ResolutionDate ||= record.LastModifiedDate?.slice(0,10)||stamp().slice(0,10);
   record.EscalationStatus='Closed';
  }else if(['High','Critical'].includes(record.Priority)){
   record.EscalationStatus ||= 'Open';
   record.EscalatedAt ||= stamp();
  }else record.EscalationStatus ||= 'Closed';
 }
 for(const task of db.tasks){
  if(!task.EscalationForCaseId&&task.Subject?.startsWith('Escalate case:'))task.EscalationForCaseId=task.RelatedToId;
 }
 for(const record of db.cases){
  if(['High','Critical'].includes(record.Priority)&&!CLOSED_CASE_STATUSES.includes(record.Status))ensureCaseEscalation(SYSTEM_ACTOR,record);
 }
}
function validate(user,obj,input,existing={}){
 const model=OBJECTS[obj];if(!model)err('Unknown object',404);
 const allowed=Object.keys(model.fields);const value={};
 for(const [k,v] of Object.entries(input||{})){
   if(!allowed.includes(k))err(`Invalid field ${k} on ${model.singular}`,400);
   if(model.fields[k].systemManaged)err(`${k} is a system-managed field`,400);
   if(!fieldAllowed(user,obj,k))err(`Field-level security: ${k} is not writable`,403);
   if(k==='OwnerId' && user.Role!=='Administrator' && user.Role!=='Sales Manager' && v!==user.Id)err('Only managers can assign records to another user',403);
   value[k]=(typeof v==='string')?v.trim():v;
 }
 const r={...defaults(obj,{}),...existing,...value};
 for(const [k,meta] of Object.entries(model.fields)){
   if(meta.required&&(r[k]===undefined||r[k]===null||String(r[k]).trim()===''))err(`${meta.label} is required`);
   if(meta.type==='select'&&r[k]!==undefined&&r[k]!==''&&!meta.options.includes(r[k]))err(`Invalid ${k}: must be ${meta.options.join(', ')}`);
   if((meta.type==='money'||meta.type==='number')&&r[k]!==undefined&&r[k]!==null&&r[k]!==''){
     const n=Number(r[k]);if(!Number.isFinite(n)||n<0)err(`${meta.label} must be a non-negative number`);r[k]=n;value[k]=n;
   }
   if(meta.type==='email'&&r[k]&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r[k]))err(`Invalid email address for ${k}`);
   if(meta.type==='date'&&r[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(r[k]))err(`Invalid ${k}; use YYYY-MM-DD`);
 }
 if(obj==='opportunities'){
   if(!existing.Id&&!['Prospecting','Qualification'].includes(r.StageName))err('New opportunities must start at Prospecting or Qualification');
   if(!existing.Id&&r.StageName==='Closed Won')err('An opportunity must be approved before it can be Closed Won');
   if(existing.Id&&value.StageName&&value.StageName!==existing.StageName){
    if(['Closed Won','Closed Lost'].includes(existing.StageName))err('A closed opportunity cannot change stages');
    if(value.StageName!=='Closed Lost'){
     const currentIndex=OPPORTUNITY_STAGES.indexOf(existing.StageName);
     const nextIndex=OPPORTUNITY_STAGES.indexOf(value.StageName);
     if(nextIndex!==currentIndex+1)err('Advance an opportunity one stage at a time');
    }
    if(value.StageName==='Closed Won'&&existing.ApprovalStatus!=='Approved')err('Manager approval is required before closing an opportunity as Won');
   }
   if('StageName' in value || !existing.Id)value.Probability=STAGE_PROBABILITIES[r.StageName]??10;
 }
 if(obj==='leads'&&value.Status==='Converted'&&existing.Status!=='Converted')err('Use the Convert Lead action instead of setting Converted manually');
 if(obj==='leads'&&existing.Status==='Converted'&&value.Status!==undefined&&value.Status!=='Converted')err('Converted leads cannot return to an open status');
 if(obj==='cases'&&CLOSED_CASE_STATUSES.includes(r.Status)&&!r.ResolutionDate)err('ResolutionDate is required before resolving or closing a Case');
 if(obj==='cases'&&CLOSED_CASE_STATUSES.includes(existing.Status)&&value.Status&&!CLOSED_CASE_STATUSES.includes(value.Status))err('Resolved Cases cannot be reopened');
 if(obj==='tasks'&&existing.EscalationForCaseId&&existing.Status==='Completed'&&value.Status&&value.Status!=='Completed')err('A closed escalation task cannot be reopened');
 for(const [name,target] of [['AccountId','accounts'],['ContactId','contacts']]){
   if(r[name] && model.fields[name] && !db[target].some(x=>x.Id===r[name]))err(`${name} references a nonexistent record`);
 }
 if(obj==='accounts'&&r.AccountNumber&&db.accounts.some(x=>x.AccountNumber===r.AccountNumber&&x.Id!==existing.Id))err('AccountNumber must be unique');
 if(r.OwnerId&&!USERS.some(x=>x.Id===r.OwnerId))err('OwnerId must reference a known classroom user');
 if(obj==='contacts'){
   const duplicate=db.contacts.some(x=>x.Email&&r.Email&&x.Email.toLowerCase()===r.Email.toLowerCase()&&x.Id!==existing.Id);
   if(duplicate)err('Duplicate rule: a contact with this email already exists');
 }
 return value;
}
function audit(user,obj,operation,row,details=''){
 const event={id:randomBytes(5).toString('hex'),at:stamp(),actorId:user.Id,actorName:user.Name,object:obj,operation,recordId:row?.Id||'',label:row?.Name||row?.Subject||[row?.FirstName,row?.LastName].filter(Boolean).join(' '),details};
 db.audit.unshift(event);
 db.activities.unshift(event);
 db.audit=db.audit.slice(0,400);
 db.activities=db.activities.slice(0,1000);
 return event;
}
function notify(userId,type,message,recordId){
 const item={Id:randomBytes(7).toString('hex'),UserId:userId,type,message,recordId,createdAt:stamp(),readAt:null};
 db.notifications.unshift(item);
 db.notifications=db.notifications.slice(0,500);
 return item;
}
function notifyManagers(type,message,recordId){for(const person of USERS.filter(x=>x.Role==='Sales Manager'))notify(person.Id,type,message,recordId);}
function taskFromFlow(ownerId,Subject,RelatedToId,priority='Normal',days=3,extra={}){
 const row={Id:addId('tasks'),CreatedDate:stamp(),LastModifiedDate:stamp(),OwnerId:ownerId,Subject,Status:'Not Started',Priority:priority,ActivityDate:new Date(Date.now()+days*86400000).toISOString().slice(0,10),RelatedToId,...extra};
 db.tasks.unshift(row);
 audit(SYSTEM_ACTOR,'tasks','CREATE',row,'Created automatically by CRM automation');
 return row;
}
function flow(name,triggerId,actionDescription){db.workflowRuns.unshift({Id:randomBytes(7).toString('hex'),name,triggerId,actionDescription,at:stamp()});db.workflowRuns=db.workflowRuns.slice(0,100);}
function fireFlow(user,obj,operation,row,previous){
 if(obj==='opportunities'&&operation==='CREATE'){
  taskFromFlow(row.OwnerId,'Follow up: '+row.Name,row.Id,'Normal',3);
  flow('New opportunity follow-up',row.Id,'Created a follow-up task automatically');
 }
 if(obj==='opportunities'&&row.StageName==='Closed Won'&&previous?.StageName!=='Closed Won'){
  taskFromFlow(row.OwnerId,'Begin onboarding: '+row.Name,row.Id,'High',1);
  flow('Closed Won onboarding',row.Id,'Created a customer onboarding task');
 }
}
function addCaseHistory(user,row,action,details=''){
 const event={Id:randomBytes(7).toString('hex'),CaseId:row.Id,action,details,ActorId:user.Id,ActorName:user.Name,at:stamp()};
 db.caseEscalationHistory.unshift(event);
 audit(user,'cases',action,row,details);
 return event;
}
function addOpportunityHistory(user,row,details={}){
 const event={Id:randomBytes(7).toString('hex'),OpportunityId:row.Id,ActorId:user.Id,ActorName:user.Name,at:stamp(),...details};
 db.opportunityHistory.unshift(event);
 return event;
}
function ensureCaseEscalation(user,row){
 if(!['High','Critical'].includes(row.Priority)||CLOSED_CASE_STATUSES.includes(row.Status))return null;
 const active=db.tasks.find(x=>x.EscalationForCaseId===row.Id&&x.Status!=='Completed');
 if(active){row.EscalationStatus='Open';return active;}
 row.EscalationStatus='Open';
 row.EscalatedAt=stamp();
 const task=taskFromFlow(SUPPORT_TEAM_ID,'Escalate case: '+row.Subject,row.Id,'High',0,{EscalationForCaseId:row.Id});
 addCaseHistory(user,row,'ESCALATION_CREATED',`Escalation task ${task.Id} assigned to Support Team`);
 notify(SUPPORT_TEAM_ID,'case-escalation',`Critical support escalation: ${row.Subject}`,row.Id);
 if(row.OwnerId!==SUPPORT_TEAM_ID)notify(row.OwnerId,'case-escalation',`Your case was escalated: ${row.Subject}`,row.Id);
 flow('Case escalation',row.Id,'Created one active escalation task for the Support Team');
 return task;
}
function closeCaseEscalations(user,row){
 row.EscalationStatus='Closed';
 row.EscalationClosedAt=stamp();
 row.EscalationClosedById=user.Id;
 for(const task of db.tasks.filter(x=>x.EscalationForCaseId===row.Id&&x.Status!=='Completed')){
  task.Status='Completed';
  task.CompletedAt=row.EscalationClosedAt;
  task.CompletedById=user.Id;
  task.LastModifiedDate=row.EscalationClosedAt;
  audit(user,'tasks','ESCALATION_TASK_COMPLETED',task,`Completed when Case ${row.Id} was resolved`);
  addCaseHistory(user,row,'TASK_COMPLETED',`Escalation task ${task.Id} completed by ${user.Name}`);
 }
 addCaseHistory(user,row,'ESCALATION_CLOSED',`Case resolved on ${row.ResolutionDate}`);
 notify(SUPPORT_TEAM_ID,'case-resolved',`Escalated case resolved: ${row.Subject}`,row.Id);
}
export function create(user,obj,input){
 load();checkObject(user,obj,'C');
 const submitted={...input,OwnerId:input?.OwnerId||user.Id};
 if(obj==='accounts'&&!submitted.AccountNumber){
  const max=db.accounts.reduce((highest,item)=>Math.max(highest,Number(String(item.AccountNumber||'').replace(/\D/g,''))||0),0);
  submitted.AccountNumber=`AC-${String(max+1).padStart(6,'0')}`;
 }
 const values=validate(user,obj,submitted);
 const row={Id:addId(obj),CreatedDate:stamp(),LastModifiedDate:stamp(),...defaults(obj,values)};
 if(obj==='cases')row.CaseNumber=String(100000+db.cases.length+1);
 db[obj].unshift(row);
 audit(user,obj,'CREATE',row);
 if(obj==='opportunities')addOpportunityHistory(user,row,{fromStage:null,toStage:row.StageName,probability:row.Probability,approvalStatus:row.ApprovalStatus});
 fireFlow(user,obj,'CREATE',row);
 if(obj==='cases')ensureCaseEscalation(user,row);
 persist();return sanitize(user,obj,row);
}
export function update(user,obj,id,input){
 load();checkObject(user,obj,'U');
 const row=db[obj].find(x=>x.Id===id);if(!row)err('Record not found',404);
 checkOwner(user,obj,row,'U');
 const previous={...row},values=validate(user,obj,input,row);
 Object.assign(row,values,{LastModifiedDate:stamp()});
 audit(user,obj,'UPDATE',row,'Fields: '+Object.keys(values).join(', '));
 if(obj==='opportunities'&&previous.StageName!==row.StageName){
  addOpportunityHistory(user,row,{fromStage:previous.StageName,toStage:row.StageName,probability:row.Probability,approvalStatus:row.ApprovalStatus});
  audit(user,'opportunities','STAGE_CHANGED',row,`${previous.StageName} → ${row.StageName}; probability ${row.Probability}%`);
  notify(row.OwnerId,'opportunity-stage',`${row.Name} moved to ${row.StageName}`,row.Id);
  flow('Opportunity stage follow-up',row.Id,`Updated forecast probability to ${row.Probability}%`);
 }
 if(obj==='cases'){
  if(previous.OwnerId!==row.OwnerId){
   addCaseHistory(user,row,'ASSIGNMENT_CHANGED',`Assigned from ${previous.OwnerId} to ${row.OwnerId}`);
   notify(row.OwnerId,'case-assigned',`Case assigned to you: ${row.Subject}`,row.Id);
  }
  if(previous.Status!==row.Status){
   addCaseHistory(user,row,'STATUS_CHANGED',`${previous.Status} → ${row.Status}`);
   notify(row.OwnerId,'case-status',`Case status changed to ${row.Status}: ${row.Subject}`,row.Id);
  }
  if(previous.ResolutionDate!==row.ResolutionDate)addCaseHistory(user,row,'RESOLUTION_UPDATED',`Resolution date set to ${row.ResolutionDate||'cleared'}`);
  if(CLOSED_CASE_STATUSES.includes(row.Status)&&!CLOSED_CASE_STATUSES.includes(previous.Status))closeCaseEscalations(user,row);
  else ensureCaseEscalation(user,row);
 }
 if(obj==='tasks'&&previous.Status!=='Completed'&&row.Status==='Completed'){
  row.CompletedAt=stamp();row.CompletedById=user.Id;
  audit(user,'tasks','TASK_COMPLETED',row,`Completed by ${user.Name}`);
 }
 fireFlow(user,obj,'UPDATE',row,previous);
 persist();return sanitize(user,obj,row);
}
export function remove(user,obj,id){
 load();checkObject(user,obj,'D');
 const index=db[obj].findIndex(x=>x.Id===id);if(index<0)err('Record not found',404);
 const row=db[obj][index];checkOwner(user,obj,row,'D');
 if(obj==='accounts'&&(['contacts','opportunities','cases'].some(t=>db[t].some(x=>x.AccountId===id))||db.tasks.some(x=>x.RelatedToId===id)))err('Relationship rule: cannot delete an Account with related records');
 if(obj==='contacts'&&db.cases.some(x=>x.ContactId===id))err('Relationship rule: cannot delete a Contact linked to Cases');
 if(obj==='cases'&&(db.tasks.some(x=>x.EscalationForCaseId===id)||db.caseEscalationHistory.some(x=>x.CaseId===id)))err('Cases with escalation history are retained for audit');
 if(obj==='tasks'&&row.EscalationForCaseId)err('Escalation tasks are retained for audit history');
 db[obj].splice(index,1);audit(user,obj,'DELETE',row);persist();return {success:true,deletedId:id};
}
export function convertLead(user,id,{accountId}={}){
 load();checkObject(user,'leads','U');checkObject(user,'accounts','C');checkObject(user,'contacts','C');checkObject(user,'opportunities','C');
 const lead=db.leads.find(x=>x.Id===id);if(!lead)err('Lead not found',404);
 checkOwner(user,'leads',lead,'U');
 if(lead.Status==='Converted')err('Lead has already been converted');
 if(lead.Status!=='Qualified')err('Lead must be Qualified before conversion');
 let account;
 if(accountId){
  checkObject(user,'accounts','R');
  account=db.accounts.find(x=>x.Id===accountId);
  if(!account)err('Selected Account was not found',404);
  checkOwner(user,'accounts',account,'R');
 }else account=db.accounts.find(a=>a.Name.trim().toLowerCase()===lead.Company.trim().toLowerCase());
 const reusedAccount=Boolean(account);
 if(!account){
  const max=db.accounts.reduce((highest,item)=>Math.max(highest,Number(String(item.AccountNumber||'').replace(/\D/g,''))||0),0);
  account=createInternal('accounts',lead.OwnerId,{Name:lead.Company,AccountNumber:`AC-${String(max+1).padStart(6,'0')}`,Industry:lead.Industry||'Other',Status:'Active'});
  audit(user,'accounts','CREATE',account,'Created during Lead conversion');
 }
 const contact=createInternal('contacts',lead.OwnerId,{FirstName:lead.FirstName||'',LastName:lead.LastName,Email:lead.Email||'',Phone:lead.Phone||'',AccountId:account.Id});
 audit(user,'contacts','CREATE',contact,'Created during Lead conversion');
 const opportunity=createInternal('opportunities',lead.OwnerId,{Name:lead.Company+' - Initial Opportunity',AccountId:account.Id,StageName:'Qualification',Amount:0,CloseDate:new Date(Date.now()+30*86400000).toISOString().slice(0,10),Probability:STAGE_PROBABILITIES.Qualification,ApprovalStatus:'Not Submitted'});
 audit(user,'opportunities','CREATE',opportunity,'Created during Lead conversion');
 addOpportunityHistory(user,opportunity,{fromStage:null,toStage:opportunity.StageName,probability:opportunity.Probability,approvalStatus:opportunity.ApprovalStatus,details:'Created during Lead conversion'});
 Object.assign(lead,{Status:'Converted',ConvertedAccountId:account.Id,ConvertedContactId:contact.Id,ConvertedOpportunityId:opportunity.Id,ConversionDate:stamp(),LastModifiedDate:stamp()});
 audit(user,'leads','CONVERT',lead,`Account ${account.Id}; Contact ${contact.Id}; Opportunity ${opportunity.Id}`);
 taskFromFlow(lead.OwnerId,`Welcome call: ${lead.FirstName||''} ${lead.LastName}`,contact.Id,'Normal',1);
 flow('Lead qualification follow-up',lead.Id,'Created Account, Contact, Opportunity and welcome-call task');
 persist();return {Lead:sanitize(user,'leads',lead),Account:sanitize(user,'accounts',account),Contact:sanitize(user,'contacts',contact),Opportunity:sanitize(user,'opportunities',opportunity),reusedAccount,conversionDate:lead.ConversionDate};
}
function createInternal(obj,OwnerId,values){
 const row={Id:addId(obj),OwnerId,CreatedDate:stamp(),LastModifiedDate:stamp(),...defaults(obj,values)};
 db[obj].unshift(row);return row;
}
export function updateOpportunityApproval(user,id,{decision}={}){
 load();checkObject(user,'opportunities','U');
 const row=db.opportunities.find(x=>x.Id===id);if(!row)err('Opportunity not found',404);
 checkOwner(user,'opportunities',row,'U');
 if(decision==='request'){
  if(['Closed Won','Closed Lost'].includes(row.StageName))err('Closed opportunities cannot be submitted for approval');
  if(row.ApprovalStatus==='Pending')err('Approval is already pending');
  row.ApprovalStatus='Pending';row.ApprovalRequestedAt=stamp();row.ApprovedById=null;row.ApprovedAt=null;
  audit(user,'opportunities','APPROVAL_REQUESTED',row,'Manager approval requested before Closed Won');
  notifyManagers('opportunity-approval',`Approval requested: ${row.Name}`,row.Id);
  flow('Closed Won approval',row.Id,'Routed approval request to a Sales Manager');
 }else if(decision==='approve'||decision==='reject'){
  if(!['Administrator','Sales Manager'].includes(user.Role))err('Only a Sales Manager or Administrator can decide approval',403);
  if(row.ApprovalStatus!=='Pending')err('Opportunity has no pending approval request');
  row.ApprovalStatus=decision==='approve'?'Approved':'Rejected';
  row.ApprovedById=decision==='approve'?user.Id:null;
  row.ApprovedAt=decision==='approve'?stamp():null;
  audit(user,'opportunities',decision==='approve'?'APPROVAL_APPROVED':'APPROVAL_REJECTED',row,`Decision by ${user.Name}`);
  notify(row.OwnerId,'opportunity-approval',`Approval ${decision==='approve'?'approved':'rejected'}: ${row.Name}`,row.Id);
 }else err('Decision must be request, approve, or reject');
 row.LastModifiedDate=stamp();
 addOpportunityHistory(user,row,{fromStage:row.StageName,toStage:row.StageName,approvalStatus:row.ApprovalStatus,details:decision});
 persist();return sanitize(user,'opportunities',row);
}
export function getOpportunityHistory(user,id){
 load();checkObject(user,'opportunities','R');
 const row=db.opportunities.find(x=>x.Id===id);if(!row)err('Opportunity not found',404);
 checkOwner(user,'opportunities',row,'R');
 return db.opportunityHistory.filter(x=>x.OpportunityId===id);
}
export function getCaseEscalationHistory(user,id){
 load();checkObject(user,'cases','R');
 const row=db.cases.find(x=>x.Id===id);if(!row)err('Case not found',404);
 checkOwner(user,'cases',row,'R');
 return db.caseEscalationHistory.filter(x=>x.CaseId===id);
}
export function evaluateSlaBreaches(now=Date.now()){
 load();
 let changed=false;
 for(const row of db.cases){
  if(row.SlaBreachedAt||CLOSED_CASE_STATUSES.includes(row.Status)||!['High','Critical'].includes(row.Priority))continue;
  const threshold=row.Priority==='Critical'?4:24;
  const opened=Date.parse(row.EscalatedAt||row.CreatedDate||stamp());
  if(!Number.isFinite(opened)||now-opened<threshold*60*60*1000)continue;
  row.SlaBreachedAt=stamp();
  addCaseHistory(SYSTEM_ACTOR,row,'SLA_BREACHED',`${row.Priority} priority SLA exceeded ${threshold} hours`);
  notifyManagers('case-sla-breach',`SLA breached for ${row.Priority} case: ${row.Subject}`,row.Id);
  notify(row.OwnerId,'case-sla-breach',`SLA breached for your case: ${row.Subject}`,row.Id);
  changed=true;
 }
 if(changed)persist();
}
export function getNotifications(user){
 load();evaluateSlaBreaches();
 return db.notifications.filter(x=>x.UserId===user.Id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export function markNotificationRead(user,id){
 load();const item=db.notifications.find(x=>x.Id===id);
 if(!item)err('Notification not found',404);
 if(item.UserId!==user.Id&&user.Role!=='Administrator')err('This notification belongs to another user',403);
 item.readAt ||= stamp();persist();return item;
}
export function getAccount360(user,id,options={}){
 load();evaluateSlaBreaches();checkObject(user,'accounts','R');
 const account=getOne(user,'accounts',id);
 const related={
  contacts:can(user,'contacts','R')?getAll(user,'contacts').filter(x=>x.AccountId===id):[],
  opportunities:can(user,'opportunities','R')?getAll(user,'opportunities').filter(x=>x.AccountId===id):[],
  cases:can(user,'cases','R')?getAll(user,'cases').filter(x=>x.AccountId===id):[],
  leads:can(user,'leads','R')?getAll(user,'leads').filter(x=>x.ConvertedAccountId===id):[]
 };
 const linkedIds=new Set([id,...related.contacts.map(x=>x.Id),...related.opportunities.map(x=>x.Id),...related.cases.map(x=>x.Id),...related.leads.map(x=>x.Id)]);
 related.tasks=can(user,'tasks','R')?getAll(user,'tasks').filter(x=>linkedIds.has(x.RelatedToId)||x.RelatedToId===id):[];
 for(const task of related.tasks)linkedIds.add(task.Id);
 const activities=db.activities.filter(x=>linkedIds.has(x.recordId)).sort((a,b)=>b.at.localeCompare(a.at));
 const openOpportunities=related.opportunities.filter(x=>!['Closed Won','Closed Lost'].includes(x.StageName));
 const openCases=related.cases.filter(x=>!CLOSED_CASE_STATUSES.includes(x.Status));
 const pendingTasks=related.tasks.filter(x=>x.Status!=='Completed');
 const overdueTasks=pendingTasks.filter(x=>x.ActivityDate&&x.ActivityDate<new Date().toISOString().slice(0,10));
 const healthStatus=openCases.some(x=>x.Priority==='Critical')||overdueTasks.length?'At Risk':openCases.some(x=>x.Priority==='High')?'Needs Attention':'Healthy';
 const tab=['contacts','opportunities','cases','tasks','activity'].includes(options.tab)?options.tab:'contacts';
 const source=tab==='activity'?activities:related[tab];
 const term=String(options.q||'').trim().toLowerCase();
 const statusField=tab==='opportunities'?'StageName':['cases','tasks'].includes(tab)?'Status':null;
 const byStatus=statusField&&options.status?source.filter(x=>x[statusField]===options.status):source;
 const filtered=term?byStatus.filter(x=>Object.values(x).some(v=>String(v??'').toLowerCase().includes(term))):byStatus;
 const pageSize=Math.min(50,Math.max(1,Number(options.pageSize)||10));
 const page=Math.min(Math.max(1,Number(options.page)||1),Math.max(1,Math.ceil(filtered.length/pageSize)));
 const rows=filtered.slice((page-1)*pageSize,page*pageSize);
 const escalationCases=related.cases.filter(x=>x.EscalationStatus==='Open');
 const escalationTimeline=db.caseEscalationHistory.filter(x=>escalationCases.some(c=>c.Id===x.CaseId)||related.cases.some(c=>c.Id===x.CaseId)).sort((a,b)=>b.at.localeCompare(a.at));
 const summary={
  openOpportunities:openOpportunities.length,
  openCases:openCases.length,
  pendingTasks:pendingTasks.length,
  overdueTasks:overdueTasks.length,
  caseEscalations:escalationCases.length,
  openPipeline:openOpportunities.reduce((total,x)=>total+Number(x.Amount||0),0),
  weightedForecast:openOpportunities.reduce((total,x)=>total+Number(x.Amount||0)*Number(x.Probability||0)/100,0)
 };
 return {account,healthStatus,summary,relatedCounts:Object.fromEntries(Object.entries(related).map(([key,rows])=>[key,rows.length])),tab,rows,total:filtered.length,page,pageSize,pageCount:Math.max(1,Math.ceil(filtered.length/pageSize)),recentActivities:activities.slice(0,10),escalationTimeline};
}
export function stats(user){load();const all={};for(const obj of Object.keys(OBJECTS))all[obj]=can(user,obj,'R')?getAll(user,obj):[];
 const active=all.opportunities.filter(x=>!['Closed Won','Closed Lost'].includes(x.StageName));
 const pipeline=active.reduce((sum,o)=>sum+Number(o.Amount||0),0);
 const weighted=active.reduce((sum,o)=>sum+Number(o.Amount||0)*Number(o.Probability||0)/100,0);
 const won=all.opportunities.filter(x=>x.StageName==='Closed Won').reduce((sum,o)=>sum+Number(o.Amount||0),0);
 const breakdown=Object.keys(STAGE_PROBABILITIES).map(stage=>({stage,count:all.opportunities.filter(x=>x.StageName===stage).length,amount:all.opportunities.filter(x=>x.StageName===stage).reduce((sum,o)=>sum+Number(o.Amount||0),0)}));
 return {totalLeads:all.leads.length,unconvertedLeads:all.leads.filter(x=>x.Status!=='Converted').length,totalAccounts:all.accounts.length,totalContacts:all.contacts.length,openCases:all.cases.filter(x=>!CLOSED_CASE_STATUSES.includes(x.Status)).length,overdueTasks:all.tasks.filter(x=>x.Status!=='Completed'&&x.ActivityDate<new Date().toISOString().slice(0,10)).length,pipeline,weighted,won,pendingApprovals:all.opportunities.filter(x=>x.ApprovalStatus==='Pending').length,breakdown,recentActivities:db.audit.slice(0,7),recentFlows:db.workflowRuns.slice(0,6)};
}
export function getAudit(user){load();if(!['Administrator','Sales Manager'].includes(user.Role))err('Only managers and administrators can inspect audit history',403);return db.audit;}
export function getFlows(user){load();return {definitions:WORKFLOWS,runs:['Administrator','Sales Manager'].includes(user.Role)?db.workflowRuns:db.workflowRuns.slice(0,10)};}
export function getSecurity(user){return {user,roles:USERS,permissions:ROLE_PERMISSIONS[user.Role],allPermissions:ROLE_PERMISSIONS,hiddenFields:HIDDEN_FIELDS[user.Role]||{},notes:'ROLE SIMULATION ONLY: x-demo-user is a trusted classroom selector, NOT real authentication.'};}
export function getMeta(){return {objects:OBJECTS,users:USERS,stages:STAGE_PROBABILITIES};}
export function reset(user){if(user.Role!=='Administrator')err('Administrator role required for reset',403);db=seed();persist();return {success:true,message:'Sample CRM data restored'};}
export function dbHealth(){load();return {status:'ok',storage:dbPath,objects:Object.fromEntries(Object.keys(OBJECTS).map(k=>[k,db[k].length]))};}
