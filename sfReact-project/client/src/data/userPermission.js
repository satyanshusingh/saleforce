export const demoUsers = [
  { id: 'u1', name: 'Morgan Admin', role: 'admin', title: 'Admin', initials: 'MA', color: '#6558d3' },
  { id: 'u3', name: 'Daniel Manager', role: 'manager', title: 'Sales Manager', initials: 'DM', color: '#d58a32' },
  { id: 'u2', name: 'Riya Sales', role: 'sales', title: 'Sales Representative', initials: 'RS', color: '#3989c9' },
  { id: 'u4', name: 'Sam Support', role: 'support', title: 'Support Agent', initials: 'SS', color: '#188c76' }
];

export const permissions = {
  admin: { leads: 'CRUD', accounts: 'CRUD', contacts: 'CRUD', opportunities: 'CRUD', cases: 'CRUD', tasks: 'CRUD' },
  manager: { leads: 'CRUD', accounts: 'CRUD', contacts: 'CRUD', opportunities: 'CRUD', cases: 'R', tasks: 'CRU' },
  sales: { leads: 'CRU', accounts: 'CR', contacts: 'CRU', opportunities: 'CRU', cases: 'R', tasks: 'CRU' },
  support: { accounts: 'R', contacts: 'R', cases: 'CRUD', tasks: 'CRU' }
};

export const can = (role, resource, action) => Boolean(permissions[role]?.[resource]?.includes(action));
