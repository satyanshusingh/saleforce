import { resources } from './model.js';

const stageProbability = { Prospecting: 10, Qualification: 25, Proposal: 50, Negotiation: 75, 'Closed Won': 100, 'Closed Lost': 0 };
const defaults = {
  leads: { status: 'New', rating: 'Warm', leadSource: 'Website' },
  opportunities: { stageName: 'Prospecting', amount: 0 },
  cases: { status: 'New', priority: 'Medium', origin: 'Web' },
  tasks: { status: 'Not Started', priority: 'Normal' }
};

export function validateRecord(user, resource, input, existing = {}) {
  const config = resources[resource];
  const value = {};
  for (const [key, raw] of Object.entries(input || {})) {
    if (['id', 'createdAt', 'updatedAt', 'caseNumber'].includes(key) || !config.fields[key]) {
      throw Object.assign(new Error(`Invalid or system-managed field: ${key}`), { status: 400 });
    }
    const meta = config.fields[key];
    if (resource === 'accounts' && key === 'annualRevenue' && ['sales', 'support'].includes(user.role)) {
      throw Object.assign(new Error('This role cannot view or update annual revenue'), { status: 403 });
    }
    const entry = typeof raw === 'string' ? raw.trim() : raw;
    if (meta.type === 'select' && entry && !meta.options.includes(entry)) {
      throw Object.assign(new Error(`Invalid ${meta.label}`), { status: 400 });
    }
    if (meta.type === 'number' && entry !== '' && entry != null && (!Number.isFinite(Number(entry)) || Number(entry) < 0)) {
      throw Object.assign(new Error(`${meta.label} must be a non-negative number`), { status: 400 });
    }
    if (meta.type === 'email' && entry && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry)) {
      throw Object.assign(new Error('Enter a valid email address'), { status: 400 });
    }
    if (meta.type === 'date' && entry && !/^\d{4}-\d{2}-\d{2}$/.test(entry)) {
      throw Object.assign(new Error(`${meta.label} must use YYYY-MM-DD`), { status: 400 });
    }
    value[key] = meta.type === 'number' && entry !== '' && entry != null ? Number(entry) : entry;
  }
  const combined = { ...defaults[resource], ...existing, ...value };
  for (const [key, meta] of Object.entries(config.fields)) {
    if (meta.required && !String(combined[key] ?? '').trim()) {
      throw Object.assign(new Error(`${meta.label} is required`), { status: 400 });
    }
  }
  if (resource === 'opportunities' && value.stageName) value.probability = stageProbability[value.stageName];
  if (resource === 'leads' && existing.status === 'Converted' && value.status && value.status !== 'Converted') {
    throw Object.assign(new Error('Converted leads cannot be reopened'), { status: 400 });
  }
  if (resource === 'leads' && value.status === 'Converted') {
    throw Object.assign(new Error('Use the Convert action to convert a lead'), { status: 400 });
  }
  return value;
}
