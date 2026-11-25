/**
 * Educational GraphQL SUBSET for account-free teaching.
 * NOT a full GraphQL implementation or Salesforce UI API schema.
 * Supports query/mutation operation, variable refs, selection projection,
 * connection edges/node/value, totalCount, and six object CRUD mutations.
 * Does not support aliases, fragments, directives or introspection.
 */
import {OBJECTS} from './model.mjs';
import {getAll,create,update,remove,fieldAllowed,CRMError} from './engine.mjs';

const names=Object.fromEntries(Object.entries(OBJECTS).map(([k,v])=>[v.singular,k]));
const whites=/\s|,/;
function scan(input){
  const tokens=[];let i=0;
  while(i<input.length){const c=input[i];
    if(whites.test(c)){i++;continue;}
    if(c==='#'){while(i<input.length&&input[i]!=='\n')i++;continue;}
    if(/[A-Za-z_]/.test(c)){let j=i+1;while(j<input.length&&/[A-Za-z0-9_]/.test(input[j]))j++;tokens.push({type:'name',value:input.slice(i,j)});i=j;continue;}
    if(c==='"'){let j=i+1,escape=false;for(;j<input.length;j++){if(!escape&&input[j]==='"')break;if(input[j]==='\\'&&!escape)escape=true;else escape=false;}if(j===input.length)throw Error('Unterminated string');tokens.push({type:'string',value:JSON.parse(input.slice(i,j+1))});i=j+1;continue;}
    if(/[0-9-]/.test(c)){let j=i+1;while(j<input.length&&/[0-9.]/.test(input[j]))j++;tokens.push({type:'number',value:Number(input.slice(i,j))});i=j;continue;}
    if('{}():$![]=|'.includes(c)){tokens.push({type:c,value:c});i++;continue;}
    throw Error(`Unsupported GraphQL token '${c}'. This is an educational subset.`);
  }
  return tokens;
}
function parse(doc,variables={}){
 const t=scan(doc),idx={i:0};const peek=()=>t[idx.i],eat=(c)=>{const x=t[idx.i++];if(!x||x.value!==c)throw Error(`Expected ${c}; found ${x?.value??'end of input'}`);return x;};
 function value(){const k=peek();if(!k)throw Error('Expected value');
   if(k.value==='$'){idx.i++;const n=peek()?.value;idx.i++;return variables[n];}
   if(k.value==='{'){eat('{');const o={};while(peek()&&peek().value!=='}'){const n=peek().value;idx.i++;eat(':');o[n]=value();}eat('}');return o;}
   if(k.value==='['){eat('[');const a=[];while(peek()&&peek().value!==']')a.push(value());eat(']');return a;}
   idx.i++;return k.value==='true'?true:k.value==='false'?false:k.value==='null'?null:k.value;
 }
 function args(){const a={};if(peek()?.value!=='(')return a;eat('(');while(peek()&&peek().value!==')'){const key=peek().value;idx.i++;eat(':');a[key]=value();}eat(')');return a;}
 function fields(){eat('{');const out=[];while(peek()&&peek().value!=='}'){const n=peek().value;idx.i++;const a=args();const select=peek()?.value==='{'?fields():null;out.push({name:n,args:a,select});}eat('}');return out;}
 let operation='query';if(['query','mutation'].includes(peek()?.value)){operation=peek().value;idx.i++;if(peek()?.type==='name')idx.i++;if(peek()?.value==='('){let depth=0;do{const x=peek();idx.i++;if(x.value==='(')depth++;if(x.value===')')depth--;}while(depth>0&&peek());}}
 return {operation,fields:fields()};
}
function nodeProjection(user,obj,row,fields){const res={};
 for(const f of fields||[]){const name=f.name;
   if(name==='Id'){res.Id=row.Id;continue;}
   if(!OBJECTS[obj].fields[name] && !['CreatedDate','LastModifiedDate','CaseNumber'].includes(name))throw Error(`FieldUndefined: Field '${name}' is not defined on ${OBJECTS[obj].singular}`);
   if(!fieldAllowed(user,obj,name))throw Error(`Field-level security: '${name}' is not accessible`);
   const val=row[name]??null;
   if(!f.select)throw Error(`Field '${name}' requires a { value } selection in this teaching schema`);
   const detail={};for(const x of f.select){if(x.name==='value')detail.value=val;else if(x.name==='displayValue')detail.displayValue=String(val??'');else throw Error('Unknown field-value attribute: '+x.name);}res[name]=detail;
 }
 return res;
}
function execQuery(user,fields){const out={};
 for(const fld of fields){if(fld.name!=='uiapi')throw Error('Only uiapi root field is supported');const body={};
 for(const segment of fld.select||[]){if(segment.name!=='query')throw Error('For reads use uiapi { query { ... } }');const collection={};
 for(const objectField of segment.select||[]){const obj=names[objectField.name];if(!obj)throw Error('FieldUndefined: unknown object '+objectField.name);
 const records=getAll(user,obj),first=Math.min(200,Math.max(0,Number(objectField.args.first??20)));
 const entries=records.slice(0,first).map(record=>({node:record,cursor:record.Id}));const connection={};
 for(const selection of objectField.select||[]){
  if(selection.name==='totalCount')connection.totalCount=records.length;
  else if(selection.name==='edges')connection.edges=entries.map(e=>{
    const edge={};for(const sub of selection.select||[]){if(sub.name==='cursor')edge.cursor=e.cursor;else if(sub.name==='node')edge.node=nodeProjection(user,obj,e.node,sub.select);else throw Error('Unknown Edge field '+sub.name);}return edge;});
  else if(selection.name==='pageInfo'){connection.pageInfo={};for(const x of selection.select||[]){if(x.name==='hasNextPage')connection.pageInfo.hasNextPage=records.length>first;else throw Error('Unknown pageInfo field');}}
  else throw Error('Unknown connection field: '+selection.name);
 }
 collection[objectField.name]=connection;
 }body.query=collection;
 }out.uiapi=body;
 }return out;
}
function execMutation(user,fields){const out={};
 for(const root of fields){if(root.name!=='uiapi')throw Error('For writes use uiapi mutation root');const result={};
 for(const mutation of root.select||[]){
   const m=/^(Account|Contact|Lead|Opportunity|Case|Task)(Create|Update|Delete)$/.exec(mutation.name);
   if(!m)throw Error('Mutation not supported: '+mutation.name);
   const obj=names[m[1]],kind=m[2],input=mutation.args.input||{};
   let record,deletedId=null;
   if(kind==='Create')record=create(user,obj,input[m[1]]||input);
   else if(kind==='Update')record=update(user,obj,input.Id||input.id,input[m[1]]||input);
   else {const del=remove(user,obj,input.Id||input.id);deletedId=del.deletedId;}
   const response={};for(const x of mutation.select||[]){if(x.name==='Record')response.Record=record?nodeProjection(user,obj,record,x.select):null;else if(x.name==='success')response.success=true;else if(x.name==='deletedId')response.deletedId=deletedId;else throw Error('Unsupported mutation response field: '+x.name);}
   result[mutation.name]=response;
 }out.uiapi=result;
 }return out;
}
export function handleGraphQL(user,body){
 try{const {operation,fields}=parse(String(body.query||''),body.variables||{});return {data:operation==='mutation'?execMutation(user,fields):execQuery(user,fields)};}
 catch(e){return {data:null,errors:[{message:e.message,extensions:{code:e instanceof CRMError?'PERMISSION_OR_VALIDATION':'GRAPHQL_SUBSET_ERROR'}}]};}
}
export const EXAMPLES={
 ListContacts:`query ListContacts {\n  uiapi { query { Contact(first: 10) {\n    totalCount\n    edges { node { Id FirstName { value } LastName { value } Email { value } Phone { value } } }\n  } } }\n}`,
 ListOpportunities:`query OpportunityPipeline {\n  uiapi { query { Opportunity(first: 20) {\n    totalCount\n    edges { node { Id Name { value } StageName { value } Amount { value } Probability { value } } }\n  } } }\n}`,
 ListCases:`query CustomerSupport { uiapi { query { Case(first: 20) { totalCount edges { node { Id Subject { value } Status { value } Priority { value } } } } } } }`,
 CreateContact:`mutation CreateContact($input: ContactCreateInput!) {\n  uiapi { ContactCreate(input: $input) {\n    Record { Id FirstName { value } LastName { value } Email { value } }\n    success\n  } }\n}`
};
