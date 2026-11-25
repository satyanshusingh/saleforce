import { randomUUID } from 'node:crypto';
import { demoUsers, rolePermissions } from './model.js';

const toCamel = (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
const toApiRecord = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [toCamel(key), value]));

export class CrmAuditService {
  constructor(database) {
    this.database = database;
  }

  async query(sql, values = []) {
    const [rows] = await this.database.query(sql, values);
    return rows;
  }

  async writeAudit(user, resource, action, row) {
    const label = row.name || row.subject || [row.first_name, row.last_name].filter(Boolean).join(' ');
    await this.database.query(
      'INSERT INTO audit_logs (id, actor_id, actor_name, resource, action, record_id, record_label) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), user.id, user.name, resource, action, row.id, label || '']
    );
  }

  async recentActivities(limit = 7) {
    const rows = await this.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [Number(limit)]);
    return rows.map(toApiRecord);
  }

  async audit(user, limit = 100) {
    if (!['admin', 'manager'].includes(user.role)) {
      throw Object.assign(new Error('Only managers and administrators can view audit history'), { status: 403 });
    }
    return this.recentActivities(limit);
  }

  async security(user) {
    return {
      user, roles: demoUsers, permissions: rolePermissions[user.role],
      allPermissions: rolePermissions, notes: 'Demo role switching only. This is not authentication.'
    };
  }
}
