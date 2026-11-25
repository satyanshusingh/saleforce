import { createDataSDK, gql } from '@salesforce/platform-sdk/data';
import { can } from '../data/userPermission.js';
import { resourceFields } from '../data/resourceFields.js';
import { listOperation } from './operations.js';
import { request } from '../api/client.js';

function assertResult(result) {
  if (result?.errors?.length) throw new Error(result.errors.map((error) => error.message).join('; '));
  if (!result?.data) throw new Error('The GraphQL server returned no data.');
  return result.data;
}

const gqlField = (field) => field[0].toUpperCase() + field.slice(1);
const apiField = (field) => field[0].toLowerCase() + field.slice(1);

export async function listRecords(resource, role, search = '') {
  const sdk = await createDataSDK();
  const query = listOperation(resource, role);
  const result = await sdk.graphql.query({ query, variables: { first: 200 } });
  const connection = assertResult(result).uiapi?.query?.[entityName(resource)];
  if (!connection) throw new Error(`Missing ${resource} connection in GraphQL response.`);
  const fields = new Set([...Object.keys(resourceFields[resource].fields), ...extraFields(resource)]);
  if (resource === 'accounts' && ['sales', 'support'].includes(role)) fields.delete('annualRevenue');
  const rows = connection.edges.map(({ node }) => {
    const record = { id: node.Id };
    for (const field of fields) record[field] = node[gqlField(field)]?.value ?? '';
    return record;
  });
  const term = search.trim().toLowerCase();
  return term ? rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term))) : rows;
}

function entityName(resource) {
  return { leads: 'Lead', accounts: 'Account', contacts: 'Contact', opportunities: 'Opportunity', cases: 'Case', tasks: 'Task' }[resource];
}

function extraFields(resource) {
  return resource === 'cases' ? ['caseNumber'] : [];
}

function toInput(resource, fields) {
  return Object.fromEntries(Object.entries(fields).map(([field, value]) => {
    const meta = resourceFields[resource]?.fields[field];
    const inputValue = meta?.type === 'number'
      ? (value === '' || value == null ? null : Number(value))
      : value;
    return [gqlField(field), inputValue];
  }));
}

async function runMutation(mutation, variables) {
  const sdk = await createDataSDK();
  return assertResult(await sdk.graphql.mutate({ mutation, variables })).uiapi;
}

export async function createRecord(resource, fields) {
  const entity = entityName(resource);
  const mutation = gql`
    mutation Create${entity}($input: ${entity}CreateInput!) {
      uiapi { ${entity}Create(input: $input) { success Record { Id } } }
    }
  `;
  return runMutation(mutation, { input: { [entity]: toInput(resource, fields) } });
}

export async function updateRecord(resource, id, fields) {
  const entity = entityName(resource);
  const mutation = gql`
    mutation Update${entity}($input: ${entity}UpdateInput!) {
      uiapi { ${entity}Update(input: $input) { success Record { Id } } }
    }
  `;
  return runMutation(mutation, { input: { Id: id, [entity]: toInput(resource, fields) } });
}

export async function deleteRecord(resource, id) {
  const entity = entityName(resource);
  const mutation = gql`
    mutation Delete${entity}($input: ${entity}DeleteInput!) {
      uiapi { ${entity}Delete(input: $input) { success deletedId } }
    }
  `;
  return runMutation(mutation, { input: { Id: id } });
}

export async function convertLead(id, accountId) {
  return request(`/leads/${encodeURIComponent(id)}/convert`, {
    method: 'POST',
    body: accountId ? { accountId } : {}
  });
}

export async function getAccount360(id, options = {}) {
  const query = new URLSearchParams({
    tab: options.tab || 'contacts',
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
    q: options.q || '',
    status: options.status || ''
  });
  return request(`/accounts/${encodeURIComponent(id)}/360?${query}`);
}

export async function submitOpportunityApproval(id, decision) {
  return request(`/opportunities/${encodeURIComponent(id)}/approval`, {
    method: 'POST',
    body: { decision }
  });
}

export async function getOpportunityHistory(id) {
  return request(`/opportunities/${encodeURIComponent(id)}/history`);
}

export async function getDashboardData(user) {
  const accessible = Object.keys(resourceFields).filter((resource) => can(user.role, resource, 'R'));
  const entries = await Promise.all(accessible.map(async (resource) => [
    resource, await listRecords(resource, user.role)
  ]));
  const records = Object.fromEntries(entries);
  const opportunities = records.opportunities || [];
  const active = opportunities.filter((record) => !['Closed Won', 'Closed Lost'].includes(record.stageName));
  const stages = ['Prospecting', 'Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalLeads: (records.leads || []).length,
    unconvertedLeads: (records.leads || []).filter((record) => record.status !== 'Converted').length,
    totalAccounts: (records.accounts || []).length,
    totalContacts: (records.contacts || []).length,
    openCases: (records.cases || []).filter((record) => !['Resolved', 'Closed'].includes(record.status)).length,
    overdueTasks: (records.tasks || []).filter((record) => record.status !== 'Completed' && record.activityDate < today).length,
    pipeline: active.reduce((sum, record) => sum + Number(record.amount || 0), 0),
    weighted: active.reduce((sum, record) => sum + Number(record.amount || 0) * Number(record.probability || 0) / 100, 0),
    won: opportunities.filter((record) => record.stageName === 'Closed Won').reduce((sum, record) => sum + Number(record.amount || 0), 0),
    breakdown: stages.map((stage) => {
      const deals = opportunities.filter((record) => record.stageName === stage);
      return { stage, count: deals.length, amount: deals.reduce((sum, record) => sum + Number(record.amount || 0), 0) };
    })
  };
}
