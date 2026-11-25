import { randomUUID } from 'node:crypto';
import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { demoUsers, resources, rolePermissions } from './model.js';
import { CrmAuditService } from './crm-audit.service.js';
import { validateRecord } from './record-validation.js';

const toCamel = (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
const toApiRecord = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [toCamel(key), value]));

export class CrmService extends CrmAuditService {
  constructor(database) {
    super(database);
  }

  async query(sql, values) {
    const [rows] = await this.database.query(sql, values);
    return rows;
  }

  async getUser(id) {
    const user = demoUsers.find((candidate) => candidate.id === id);
    if (!user) throw Object.assign(new Error('Unknown demo role'), { status: 400 });
    return user;
  }

  can(user, resource, action) {
    return Boolean(rolePermissions[user.role]?.[resource]?.includes(action));
  }

  requirePermission(user, resource, action) {
    if (!resources[resource]) throw Object.assign(new Error('Unknown resource'), { status: 404 });
    if (!this.can(user, resource, action)) {
      throw Object.assign(new Error(`${user.title} does not have ${action} access to ${resources[resource].label}`), { status: 403 });
    }
  }

  assertRecordAccess(user, resource, row, action) {
    if (user.role === 'admin' || user.role === 'manager') return;
    if (user.role === 'sales' && ['leads', 'opportunities'].includes(resource) && row.owner_id !== user.id) {
      throw Object.assign(new Error('This record is not owned by you'), { status: 403 });
    }
    if (user.role === 'sales' && action !== 'R' && row.owner_id !== user.id) {
      throw Object.assign(new Error('You can only edit records that you own'), { status: 403 });
    }
    if (user.role === 'support' && resource === 'cases' && row.owner_id !== user.id) {
      throw Object.assign(new Error('This case is not assigned to you'), { status: 403 });
    }
    if (user.role === 'support' && resource === 'tasks' && action !== 'R' && row.owner_id !== user.id) {
      throw Object.assign(new Error('You can only edit tasks that you own'), { status: 403 });
    }
  }

  sanitize(user, resource, row) {
    const result = toApiRecord(row);
    if (resource === 'accounts' && ['sales', 'support'].includes(user.role)) delete result.annualRevenue;
    return result;
  }

  async list(user, resource, search = '') {
    this.requirePermission(user, resource, 'R');
    let rows = await this.query(`SELECT * FROM ${resources[resource].table} ORDER BY created_at DESC`);
    rows = rows.filter((row) => {
      try {
        this.assertRecordAccess(user, resource, row, 'R');
        return true;
      } catch {
        return false;
      }
    });
    const term = String(search).trim().toLowerCase();
    if (term) rows = rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term)));
    return rows.map((row) => this.sanitize(user, resource, row));
  }

  async getOne(user, resource, id) {
    this.requirePermission(user, resource, 'R');
    const row = (await this.query(`SELECT * FROM ${resources[resource].table} WHERE id = ?`, [id]))[0];
    if (!row) throw Object.assign(new Error('Record not found'), { status: 404 });
    this.assertRecordAccess(user, resource, row, 'R');
    return this.sanitize(user, resource, row);
  }

  async validateReferences(resource, values, recordId = '') {
    for (const [field, table] of [['accountId', 'accounts'], ['contactId', 'contacts']]) {
      if (values[field] && resources[resource].fields[field]) {
        const found = (await this.query(`SELECT id FROM ${table} WHERE id = ?`, [values[field]]))[0];
        if (!found) throw Object.assign(new Error(`${field} references a record that does not exist`), { status: 400 });
      }
    }
    if (resource === 'contacts' && values.email) {
      const duplicate = (await this.query(
        'SELECT id FROM contacts WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1',
        [values.email, recordId]
      ))[0];
      if (duplicate) throw Object.assign(new Error('A contact with this email already exists'), { status: 400 });
    }
  }

  async createTask(ownerId, subject, relatedToId, priority = 'Normal', days = 3) {
    const due = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    await this.database.query(
      'INSERT INTO tasks (id, subject, status, priority, activity_date, related_to_id, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), subject, 'Not Started', priority, due, relatedToId, ownerId]
    );
  }

  async create(user, resource, input) {
    this.requirePermission(user, resource, 'C');
    const values = validateRecord(user, resource, { ...input, ownerId: input?.ownerId || user.id });
    await this.validateReferences(resource, values);
    if (values.ownerId && !demoUsers.some((candidate) => candidate.id === values.ownerId)) {
      throw Object.assign(new Error('Owner must be one of the four demo users'), { status: 400 });
    }
    if (values.ownerId !== user.id && !['admin', 'manager'].includes(user.role)) {
      throw Object.assign(new Error('Only managers can assign records to another owner'), { status: 403 });
    }
    const columns = Object.keys(values).map((key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`));
    const id = randomUUID();
    const insertValues = [...Object.values(values)];
    await this.database.query(
      `INSERT INTO ${resources[resource].table} (id, ${columns.join(', ')}) VALUES (${columns.map(() => '?').concat('?').join(', ')})`,
      [id, ...insertValues]
    );
    const stored = (await this.query(`SELECT * FROM ${resources[resource].table} WHERE id = ?`, [id]))[0];
    await this.writeAudit(user, resource, 'CREATE', stored);
    return this.sanitize(user, resource, stored);
  }

  async update(user, resource, id, input) {
    this.requirePermission(user, resource, 'U');
    const existing = (await this.query(`SELECT * FROM ${resources[resource].table} WHERE id = ?`, [id]))[0];
    if (!existing) throw Object.assign(new Error('Record not found'), { status: 404 });
    this.assertRecordAccess(user, resource, existing, 'U');
    const values = validateRecord(user, resource, input, toApiRecord(existing));
    await this.validateReferences(resource, values, id);
    if (values.ownerId && !demoUsers.some((candidate) => candidate.id === values.ownerId)) {
      throw Object.assign(new Error('Owner must be one of the four demo users'), { status: 400 });
    }
    if (values.ownerId && values.ownerId !== user.id && !['admin', 'manager'].includes(user.role)) {
      throw Object.assign(new Error('Only managers can assign records to another owner'), { status: 403 });
    }
    if (Object.keys(values).length) {
      const assignments = Object.keys(values).map((key) => `${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)} = ?`);
      await this.database.query(
        `UPDATE ${resources[resource].table} SET ${assignments.join(', ')} WHERE id = ?`,
        [...Object.values(values), id]
      );
    }
    const updated = (await this.query(`SELECT * FROM ${resources[resource].table} WHERE id = ?`, [id]))[0];
    await this.writeAudit(user, resource, 'UPDATE', updated);
    return this.sanitize(user, resource, updated);
  }

  async remove(user, resource, id) {
    this.requirePermission(user, resource, 'D');
    const existing = (await this.query(`SELECT * FROM ${resources[resource].table} WHERE id = ?`, [id]))[0];
    if (!existing) throw Object.assign(new Error('Record not found'), { status: 404 });
    this.assertRecordAccess(user, resource, existing, 'D');
    const references = {
      accounts: {
        sql: 'SELECT id FROM contacts WHERE account_id = ? UNION SELECT id FROM opportunities WHERE account_id = ? UNION SELECT id FROM cases WHERE account_id = ? UNION SELECT id FROM leads WHERE converted_account_id = ? LIMIT 1',
        values: [id, id, id, id],
        message: 'Cannot delete an account with linked records'
      },
      contacts: {
        sql: 'SELECT id FROM cases WHERE contact_id = ? UNION SELECT id FROM leads WHERE converted_contact_id = ? LIMIT 1',
        values: [id, id],
        message: 'Cannot delete a contact linked to a case or converted lead'
      },
      opportunities: {
        sql: 'SELECT id FROM leads WHERE converted_opportunity_id = ? LIMIT 1',
        values: [id],
        message: 'Cannot delete an opportunity linked to a converted lead'
      }
    }[resource];
    if (references) {
      const linked = await this.query(references.sql, references.values);
      if (linked.length) throw Object.assign(new Error(references.message), { status: 400 });
    }
    await this.writeAudit(user, resource, 'DELETE', existing);
    await this.database.query(`DELETE FROM ${resources[resource].table} WHERE id = ?`, [id]);
    return { success: true, deletedId: id };
  }

  async convertLead(user, id) {
    this.requirePermission(user, 'leads', 'U');
    this.requirePermission(user, 'accounts', 'C');
    this.requirePermission(user, 'contacts', 'C');
    this.requirePermission(user, 'opportunities', 'C');
    const lead = (await this.query('SELECT * FROM leads WHERE id = ?', [id]))[0];
    if (!lead) throw Object.assign(new Error('Lead not found'), { status: 404 });
    this.assertRecordAccess(user, 'leads', lead, 'U');
    if (lead.status !== 'Qualified') throw Object.assign(new Error('Lead must be Qualified before conversion'), { status: 400 });

    const account = (await this.query('SELECT * FROM accounts WHERE LOWER(name) = LOWER(?) LIMIT 1', [lead.company]))[0]
      || await this.create(user, 'accounts', { name: lead.company, industry: lead.industry || '', ownerId: lead.owner_id });
    const contact = await this.create(user, 'contacts', {
      firstName: lead.first_name || '', lastName: lead.last_name, email: lead.email || '',
      phone: lead.phone || '', accountId: account.id, ownerId: lead.owner_id
    });
    const opportunity = await this.create(user, 'opportunities', {
      name: `${lead.company} - Initial Opportunity`, accountId: account.id,
      stageName: 'Qualification', amount: 0,
      closeDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), ownerId: lead.owner_id
    });
    await this.database.query(
      'UPDATE leads SET status = ?, converted_account_id = ?, converted_contact_id = ?, converted_opportunity_id = ? WHERE id = ?',
      ['Converted', account.id, contact.id, opportunity.id, id]
    );
    const convertedLead = (await this.query('SELECT * FROM leads WHERE id = ?', [id]))[0];
    await this.writeAudit(user, 'leads', 'CONVERT', convertedLead);
    return {
      lead: this.sanitize(user, 'leads', convertedLead),
      account: this.sanitize(user, 'accounts', account),
      contact,
      opportunity
    };
  }

  async overview(user) {
    const data = {};
    for (const key of Object.keys(resources)) {
      data[key] = this.can(user, key, 'R') ? await this.list(user, key) : [];
    }
    const active = data.opportunities.filter((item) => !['Closed Won', 'Closed Lost'].includes(item.stageName));
    const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    const today = new Date().toISOString().slice(0, 10);
    return {
      totalLeads: data.leads.length,
      unconvertedLeads: data.leads.filter((item) => item.status !== 'Converted').length,
      totalAccounts: data.accounts.length,
      totalContacts: data.contacts.length,
      openCases: data.cases.filter((item) => item.status !== 'Closed').length,
      overdueTasks: data.tasks.filter((item) => item.status !== 'Completed' && item.activityDate < today).length,
      pipeline: active.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      weighted: active.reduce((sum, item) => sum + Number(item.amount || 0) * Number(item.probability || 0) / 100, 0),
      won: data.opportunities.filter((item) => item.stageName === 'Closed Won').reduce((sum, item) => sum + Number(item.amount || 0), 0),
      breakdown: stages.map((stage) => {
        const items = data.opportunities.filter((item) => item.stageName === stage);
        return { stage, count: items.length, amount: items.reduce((sum, item) => sum + Number(item.amount || 0), 0) };
      }),
      recentActivities: await this.recentActivities(7)
    };
  }
}

Inject(DatabaseService)(CrmService, undefined, 0);
Injectable()(CrmService);
