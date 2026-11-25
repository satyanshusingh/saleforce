import assert from 'node:assert/strict';
import test from 'node:test';
import { GraphqlService } from '../src/graphql.service.js';

const admin = { id: 'u1', role: 'admin', title: 'Admin' };
const sales = { id: 'u3', role: 'sales', title: 'Sales Representative' };

function createService() {
  const crm = {
    async list() {
      return [{ id: 'a1', name: 'Aurora', industry: 'Technology', annualRevenue: 1200000 }];
    },
    async create(_user, _resource, values) {
      return { id: 'c1', ...values };
    },
    async update(_user, _resource, id, values) {
      return { id, ...values };
    },
    async remove(_user, _resource, id) {
      return { success: true, deletedId: id };
    },
    async convertLead() {}
  };
  return new GraphqlService(crm);
}

test('executes a UI API-style query and returns value wrappers', async () => {
  const service = createService();
  const result = await service.execute(admin, {
    query: `query Accounts {
      uiapi { query { Account(first: 5) {
        totalCount edges { node { Id Name { value } AnnualRevenue { value } } }
      } } }
    }`
  });

  assert.equal(result.errors, undefined);
  assert.equal(result.data.uiapi.query.Account.totalCount, 1);
  assert.equal(result.data.uiapi.query.Account.edges[0].node.Name.value, 'Aurora');
  assert.equal(result.data.uiapi.query.Account.edges[0].node.AnnualRevenue.value, 1200000);
});

test('rejects a restricted field query for a sales role', async () => {
  const result = await createService().execute(sales, {
    query: `query Revenue {
      uiapi { query { Account(first: 10) {
        edges { node { AnnualRevenue { value } } }
      } } }
    }`
  });

  assert.ok(result.errors?.some((error) => /Field-level security/.test(error.message)));
});

test('maps SDK mutation input fields to the CRM service model', async () => {
  let created;
  const service = new GraphqlService({
    async create(_user, resource, values) {
      created = { resource, values };
      return { id: 'c1', ...values };
    }
  });
  const result = await service.execute(admin, {
    query: `mutation AddContact($input: ContactCreateInput!) {
      uiapi { ContactCreate(input: $input) { success Record { Id LastName { value } } } }
    }`,
    variables: { input: { Contact: { FirstName: 'Kavya', LastName: 'Rao' } } }
  });

  assert.equal(result.errors, undefined);
  assert.deepEqual(created, { resource: 'contacts', values: { firstName: 'Kavya', lastName: 'Rao' } });
  assert.equal(result.data.uiapi.ContactCreate.Record.LastName.value, 'Rao');
});
