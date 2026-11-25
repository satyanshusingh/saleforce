import {test, beforeEach, after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'mk-academy-sdk-'));
process.env.CRM_DB_PATH = join(directory, 'records.json');
const {currentUser, reset} = await import('../server/engine.mjs');
const {handleGraphQL} = await import('../server/graphql-lab.mjs');
const {createDataSDK, gql, getMockSDKHistory, clearMockSDKHistory} = await import('../src/mock-salesforce-sdk/data.js');
let actor = 'u1';
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  assert.equal(url, '/api/graphql');
  const body = JSON.parse(init.body);
  return new Response(JSON.stringify(handleGraphQL(currentUser(actor), body)), {
    status: 200,
    headers: {'content-type': 'application/json'}
  });
};
after(() => {globalThis.fetch = originalFetch; rmSync(directory, {recursive: true, force: true});});
beforeEach(() => {actor = 'u1'; reset(currentUser('u1')); clearMockSDKHistory();});

const CONTACTS = gql`query ListContacts {uiapi {query {Contact(first: 50) {totalCount edges {node {Id FirstName {value} LastName {value} Email {value}}}}}}}`;
const ADD = gql`mutation CreateContact($input: ContactCreateInput!) {uiapi {ContactCreate(input:$input){Record{Id FirstName{value} LastName{value}}}}}`;
const EDIT = gql`mutation UpdateContact($input: ContactUpdateInput!) {uiapi {ContactUpdate(input:$input){Record{Id Phone{value}}}}}`;
const REMOVE = gql`mutation DeleteContact($input: ContactDeleteInput!) {uiapi {ContactDelete(input:$input){deletedId}}}`;

test('gql tags preserve GraphQL document strings', () => assert.match(CONTACTS, /Contact\(first: 50\)/));
test('mock Salesforce Data SDK reads UI API-shaped Contact records', async () => {
  const sdk = await createDataSDK();
  const result = await sdk.graphql?.query({query: CONTACTS});
  assert.equal(result.errors, undefined);
  assert.equal(result.data.uiapi.query.Contact.totalCount, 5);
  assert.ok(result.data.uiapi.query.Contact.edges[0].node.LastName.value);
  assert.equal(getMockSDKHistory()[0].kind, 'query');
});
test('mock mutation creates, updates, deletes a Contact', async () => {
  const sdk = await createDataSDK();
  const created = await sdk.graphql?.mutate({mutation: ADD, variables: {input: {Contact: {FirstName: 'MK', LastName: 'Academy', Email: 'mk-sdk-test@example.com'}}}});
  assert.equal(created.errors, undefined);
  const id = created.data.uiapi.ContactCreate.Record.Id;
  assert.ok(id.startsWith('003'));
  const updated = await sdk.graphql?.mutate({mutation: EDIT, variables: {input: {Id: id, Contact: {Phone: '555-0189'}}}});
  assert.equal(updated.data.uiapi.ContactUpdate.Record.Phone.value, '555-0189');
  const deleted = await sdk.graphql?.mutate({mutation: REMOVE, variables: {input: {Id: id}}});
  assert.equal(deleted.data.uiapi.ContactDelete.deletedId, id);
  const afterDelete = await sdk.graphql?.query({query: CONTACTS});
  assert.equal(afterDelete.data.uiapi.query.Contact.totalCount, 5);
});
test('simulator validation errors stay in result.errors', async () => {
  const sdk = await createDataSDK();
  const result = await sdk.graphql?.mutate({mutation: ADD, variables: {input: {Contact: {LastName: 'BadEmail', Email: 'invalid-value'}}}});
  assert.equal(result.data, null);
  assert.match(result.errors[0].message, /email/i);
});
test('restricted field is not returned to Sales Representative persona', async () => {
  actor = 'u2';
  const sdk = await createDataSDK();
  const q = gql`query AccountRevenue {uiapi {query {Account(first: 10){edges{node{Id AnnualRevenue{value}}}}}}}`;
  const result = await sdk.graphql?.query({query: q});
  assert.match(result.errors[0].message, /Field-level security/);
  assert.equal(result.data, null);
});
test('query refresh and subscribe behave as a simplified teaching API', async () => {
  const sdk = await createDataSDK();
  const result = await sdk.graphql?.query({query: CONTACTS});
  let updates = 0;
  const unsub = result.subscribe((snap) => {assert.equal(snap.data.uiapi.query.Contact.totalCount, 5);updates++;});
  await result.refresh();
  unsub();
  assert.equal(updates, 1);
  assert.equal(getMockSDKHistory()[0].kind, 'query/refresh');
});
