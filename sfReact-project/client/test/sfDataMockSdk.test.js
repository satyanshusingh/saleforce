import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { setCurrentDemoUser } from '../src/api/client.js';
import { createDataSDK, gql } from '../src/sdk/sfDataMockSdk.js';

const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
  setCurrentDemoUser('u1');
});

test('createDataSDK sends gql queries with the active demo role', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ data: { uiapi: { query: { Contact: { totalCount: 1 } } } } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  setCurrentDemoUser('u3');
  const sdk = await createDataSDK();
  const document = gql`query Contacts { uiapi { query { Contact { totalCount } } } }`;
  const result = await sdk.graphql.query({ query: document });

  assert.equal(result.data.uiapi.query.Contact.totalCount, 1);
  assert.equal(requests[0].url, '/api/graphql');
  assert.equal(requests[0].options.headers['x-demo-user'], 'u3');
  assert.equal(JSON.parse(requests[0].options.body).query, document);
});

test('query refresh issues a new GraphQL request and notifies subscribers', async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(JSON.stringify({ data: { count: requests } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  const sdk = await createDataSDK();
  const query = await sdk.graphql.query({ query: gql`query Count { count }` });
  let notified = false;
  const unsubscribe = query.subscribe((snapshot) => { notified = snapshot.data.count === 2; });
  await query.refresh();
  unsubscribe();

  assert.equal(requests, 2);
  assert.equal(notified, true);
});
