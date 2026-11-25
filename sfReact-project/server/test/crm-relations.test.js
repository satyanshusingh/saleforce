import assert from 'node:assert/strict';
import test from 'node:test';
import { CrmService } from '../src/crm.service.js';

test('prevents deleting an account referenced by CRM records', async () => {
  const database = {
    async query(sql) {
      if (sql.startsWith('SELECT * FROM accounts')) return [[{ id: 'a1', owner_id: 'u1' }], []];
      if (sql.startsWith('SELECT id FROM contacts')) return [[{ id: 'c1' }], []];
      throw new Error(`Unexpected SQL in test: ${sql}`);
    }
  };
  const crm = new CrmService(database);

  await assert.rejects(
    crm.remove({ id: 'u1', role: 'admin' }, 'accounts', 'a1'),
    { status: 400, message: /linked records/ }
  );
});
