import React, {useEffect, useState, useCallback} from 'react';
import {createDataSDK} from '@salesforce/platform-sdk/data';
import {
  listContacts, listAccounts, listOpportunities, createContact,
  updateContact, deleteContact, testRestrictedField
} from '../sdk/crmService.js';
import {LIST_CONTACTS, CREATE_CONTACT} from '../sdk/operations.js';
import {getMockSDKHistory, subscribeMockSDKHistory, clearMockSDKHistory} from '../mock-salesforce-sdk/data.js';
import './sdk-lab.css';

const initial = {firstName: '', lastName: '', email: '', phone: ''};
const METRICS = [
  {id: 'contacts', label: 'Contact Records', load: listContacts},
  {id: 'accounts', label: 'Accounts', load: listAccounts},
  {id: 'opportunities', label: 'Opportunities', load: listOpportunities}
];

export default function SalesforceSDKLab({user}) {
  const [dataset, setDataset] = useState('contacts');
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(() => getMockSDKHistory());
  const [inspector, setInspector] = useState('query');
  const [activeTrace, setActiveTrace] = useState(null);
  const [term, setTerm] = useState('');

  useEffect(() => subscribeMockSDKHistory(() => setHistory(getMockSDKHistory())), []);
  const load = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const spec = METRICS.find(x => x.id === dataset);
      const result = await spec.load();
      setRows(result.records); setCount(result.count);
    } catch (e) {
      setError(e.message); setRows([]); setCount(0);
    } finally {setLoading(false);}
  }, [dataset]);
  useEffect(() => {void load();}, [load, user]);
  const onChange = e => setForm(x => ({...x, [e.target.name]: e.target.value}));
  const startEdit = row => {
    setEditing(row.id);
    setForm({firstName: row.firstName, lastName: row.lastName, email: row.email, phone: row.phone});
    setNotice('Editing record ' + row.id);
  };
  const resetForm = () => {setEditing(null); setForm(initial);};
  const onSave = async e => {
    e.preventDefault();
    if (!form.lastName.trim()) {setError('Last name is required.'); return;}
    setBusy(true); setError(''); setNotice('');
    const fields = {
      FirstName: form.firstName.trim(), LastName: form.lastName.trim(),
      Email: form.email.trim(), Phone: form.phone.trim()
    };
    try {
      if (editing) await updateContact(editing, fields);
      else await createContact(fields);
      setNotice(editing ? 'Contact updated using graphql.mutate().' : 'Contact created using graphql.mutate().');
      resetForm(); await load();
    } catch (e) {setError(e.message);} finally {setBusy(false);}
  };
  const remove = async row => {
    if (!window.confirm('Delete ' + row.firstName + ' ' + row.lastName + '?')) return;
    setBusy(true); setError('');
    try {await deleteContact(row.id); setNotice('Contact deleted using graphql.mutate().'); await load();}
    catch (e) {setError(e.message);} finally {setBusy(false);}
  };
  const restricted = async () => {
    setError(''); setNotice('');
    try {
      const data = await testRestrictedField();
      const n = data.uiapi?.query?.Account?.edges?.length ?? 0;
      setNotice('Restricted field query succeeded for ' + n + ' Accounts. Switch persona and try again.');
    } catch (e) {setError(e.message);}
  };
  const rowsFiltered = rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(term.toLowerCase())));
  const current = activeTrace ?? history[0] ?? null;
  return <div className="sdk-lab">
    <div className="sdk-head"><div><div className="sdk-eyebrow">MK ACADEMY · DAY 2 SPECIAL LAB</div><h1>Salesforce Data SDK Replication</h1><p>Write authentic-looking Data SDK code. The local mock sends operations to our CRM simulator—not Salesforce.</p></div><span className="sdk-tag">MOCK SDK · NO ORG</span></div>
    <div className="sdk-explainer"><strong>Real import used in this project:</strong> <code>import {'{ createDataSDK, gql }'} from '@salesforce/platform-sdk/data';</code><span>Vite redirects that import to our classroom adapter.</span></div>
    <div className="sdk-switch">{METRICS.map(x => <button key={x.id} className={dataset === x.id ? 'active' : ''} onClick={() => {setDataset(x.id); setTerm('');}}>{x.label}</button>)}<button onClick={() => void load()} disabled={loading}>⟳ Refresh</button></div>
    {error && <div role="alert" className="sdk-error">{error}</div>}
    {notice && <div role="status" className="sdk-ok">{notice}</div>}
    <div className="sdk-topline"><b>{dataset.toUpperCase()} ({count})</b><label>Filter loaded records <input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search..." /></label></div>
    {loading ? <p className="sdk-muted">Loading using <code>sdk.graphql.query()</code>...</p> :
      <div className="sdk-table-wrap"><table className="sdk-table"><thead><tr>{dataset==='contacts'?<><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></>:dataset==='accounts'?<><th>Account</th><th>Industry</th><th>City</th></>:<><th>Opportunity</th><th>Stage</th><th>Amount</th></>}</tr></thead><tbody>{rowsFiltered.map(row => <tr key={row.id}>{dataset==='contacts'?<><td>{row.firstName} {row.lastName}</td><td>{row.email || '—'}</td><td>{row.phone || '—'}</td><td><button onClick={() => startEdit(row)} disabled={busy}>Edit</button><button className="sdk-danger" onClick={() => void remove(row)} disabled={busy}>Delete</button></td></>:dataset==='accounts'?<><td>{row.name}</td><td>{row.industry || '—'}</td><td>{row.city || '—'}</td></>:<><td>{row.name}</td><td>{row.stage}</td><td>{Number(row.amount).toLocaleString()}</td></>}</tr>)}</tbody></table>{!rowsFiltered.length && <p className="sdk-muted">No matching records.</p>}</div>}
    {dataset==='contacts' && <section className="sdk-form"><h2>{editing ? 'Update Contact (Mutation)' : 'Create Contact (Mutation)'}</h2><form onSubmit={onSave}><div className="sdk-fields">{[['firstName','First name'],['lastName','Last name *'],['email','Email'],['phone','Phone']].map(([name,label])=><label key={name}>{label}<input name={name} value={form[name]} onChange={onChange} required={name==='lastName'} type={name==='email'?'email':'text'}/></label>)}</div><div className="sdk-actions"><button type="submit" disabled={busy}>{busy?'Saving…':editing?'Update Contact':'Create Contact'}</button>{editing&&<button type="button" onClick={resetForm}>Cancel edit</button>}</div></form></section>}
    <section className="sdk-lesson"><h2>Permission & API exercises</h2><p>Current persona: <strong>{user}</strong>. Switch between Morgan Admin, Riya Sales, Daniel Manager and Sam Support using the app header.</p><button onClick={() => void restricted()}>Try Account.AnnualRevenue query (field access)</button><p className="sdk-muted">The mock server checks a classroom role header. It is not authentication and must not be used to protect real data.</p></section>
    <section className="sdk-inspector"><div className="sdk-topline"><h2>GraphQL Inspector</h2><button onClick={()=>{clearMockSDKHistory(); setActiveTrace(null);}}>Clear history</button></div><div className="sdk-switch"><button className={inspector==='query'?'active':''} onClick={()=>setInspector('query')}>Query example</button><button className={inspector==='mutation'?'active':''} onClick={()=>setInspector('mutation')}>Mutation example</button><button className={inspector==='trace'?'active':''} onClick={()=>setInspector('trace')}>Request / response trace ({history.length})</button></div>
      {inspector==='query' && <pre>{LIST_CONTACTS}</pre>}
      {inspector==='mutation' && <pre>{CREATE_CONTACT}</pre>}
      {inspector==='trace' && <><div className="sdk-traces">{history.map(call=><button key={call.id} onClick={()=>setActiveTrace(call)}>{call.kind}: {call.operation}</button>)}</div>{current?<div className="sdk-grid"><div><h3>GraphQL document</h3><pre>{current.document}</pre><h3>Variables</h3><pre>{JSON.stringify(current.variables,null,2)}</pre></div><div><h3>Response data/errors</h3><pre>{JSON.stringify({data:current.data,errors:current.errors},null,2)}</pre></div></div>:<p>Run a query or mutation to see its trace.</p>}</>}
    </section>
    <div className="sdk-lesson"><h2>Conceptual API comparison</h2><p>Our adapter supports <code>createDataSDK()</code>, <code>gql</code>, <code>sdk.graphql?.query({'{ query }'})</code> and <code>sdk.graphql?.mutate({'{ mutation, variables }'})</code>.</p><p>It does <strong>not</strong> implement the full Salesforce GraphQL schema, CSRF/session handling, reactive cache, UI API security, or actual org deployment. The delete response field <code>deletedId</code> is mock-only.</p></div>
  </div>;
}
