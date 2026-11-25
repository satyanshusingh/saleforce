import {createDataSDK} from '@salesforce/platform-sdk/data';
import {
  LIST_CONTACTS, LIST_ACCOUNTS, LIST_OPPORTUNITIES, LIST_ACCOUNT_REVENUE,
  CREATE_CONTACT, UPDATE_CONTACT, DELETE_CONTACT
} from './operations.js';

// This service is written using the official Salesforce Data SDK calling pattern.
// Vite aliases the SDK import to a MOCK when teaching without a Salesforce org.
function assertResult(result) {
  if (!result) throw new Error('GraphQL capability is unavailable in this runtime');
  if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join('; '));
  if (!result.data) throw new Error('The server returned no GraphQL data');
  return result.data;
}
const value = (node, field) => node?.[field]?.value ?? '';
const mapNode = (object, node) => {
  switch (object) {
    case 'Contact': return {
      id: node.Id, firstName: value(node, 'FirstName'),
      lastName: value(node, 'LastName'), email: value(node, 'Email'),
      phone: value(node, 'Phone'), accountId: value(node, 'AccountId')
    };
    case 'Account': return {
      id: node.Id, name: value(node, 'Name'), industry: value(node, 'Industry'),
      city: value(node, 'BillingCity')
    };
    case 'Opportunity': return {
      id: node.Id, name: value(node, 'Name'), stage: value(node, 'StageName'),
      amount: value(node, 'Amount')
    };
    default: return node;
  }
};
async function readObjects(object, query) {
  const sdk = await createDataSDK();
  const result = await sdk.graphql?.query({query});
  const data = assertResult(result);
  const connection = data.uiapi?.query?.[object];
  if (!connection) throw new Error('Missing ' + object + ' connection');
  return {
    records: (connection.edges ?? []).flatMap(edge => edge?.node ? [mapNode(object, edge.node)] : []),
    count: connection.totalCount ?? (connection.edges ?? []).length,
    // QueryResult is reactive in Salesforce; mock refresh manually refetches locally.
    refresh: result.refresh?.bind(result)
  };
}
export const listContacts = () => readObjects('Contact', LIST_CONTACTS);
export const listAccounts = () => readObjects('Account', LIST_ACCOUNTS);
export const listOpportunities = () => readObjects('Opportunity', LIST_OPPORTUNITIES);
export async function testRestrictedField() {
  const sdk = await createDataSDK();
  return assertResult(await sdk.graphql?.query({query: LIST_ACCOUNT_REVENUE}));
}
async function runMutation(mutation, input) {
  const sdk = await createDataSDK();
  const response = await sdk.graphql?.mutate({mutation, variables: {input}});
  return assertResult(response).uiapi;
}
export const createContact = fields => runMutation(CREATE_CONTACT, {Contact: fields});
export const updateContact = (id, fields) => runMutation(UPDATE_CONTACT, {Id: id, Contact: fields});
export const deleteContact = id => runMutation(DELETE_CONTACT, {Id: id});
