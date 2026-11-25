import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRecord } from '../src/record-validation.js';

const salesUser = { role: 'sales' };
const adminUser = { role: 'admin' };

test('requires core fields before creating a record', () => {
  assert.throws(() => validateRecord(adminUser, 'accounts', {}), /Account name is required/);
});

test('blocks hidden annual revenue writes for sales roles', () => {
  assert.throws(
    () => validateRecord(salesUser, 'accounts', { name: 'Example', annualRevenue: 100 }),
    { status: 403, message: /annual revenue/ }
  );
});

test('updates opportunity probability when its stage changes', () => {
  const result = validateRecord(adminUser, 'opportunities', {
    name: 'Example deal', accountId: 'account-1', closeDate: '2026-12-01', stageName: 'Negotiation'
  });
  assert.equal(result.probability, 75);
});

test('requires the lead conversion action to mark a lead converted', () => {
  assert.throws(
    () => validateRecord(adminUser, 'leads', {
      firstName: 'Demo', lastName: 'Lead', company: 'Demo Co', status: 'Converted'
    }),
    /Use the Convert action/
  );
});
