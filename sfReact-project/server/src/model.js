export const demoUsers = [
  { id: 'u1', name: 'Morgan Admin', role: 'admin', title: 'Administrator' },
  { id: 'u2', name: 'Daniel Manager', role: 'manager', title: 'Sales Manager' },
  { id: 'u3', name: 'Riya Sales', role: 'sales', title: 'Sales Representative' },
  { id: 'u4', name: 'Sam Support', role: 'support', title: 'Support Agent' }
];

export const rolePermissions = {
  admin: { leads: 'CRUD', accounts: 'CRUD', contacts: 'CRUD', opportunities: 'CRUD', cases: 'CRUD', tasks: 'CRUD' },
  manager: { leads: 'CRUD', accounts: 'CRUD', contacts: 'CRUD', opportunities: 'CRUD', cases: 'R', tasks: 'CRU' },
  sales: { leads: 'CRU', accounts: 'CR', contacts: 'CRU', opportunities: 'CRU', cases: 'R', tasks: 'CRU' },
  support: { accounts: 'R', contacts: 'R', cases: 'CRUD', tasks: 'CRU' }
};

const field = (label, type = 'text', extra = {}) => ({ label, type, ...extra });

export const resources = {
  leads: {
    label: 'Leads',
    singular: 'Lead',
    table: 'leads',
    fields: {
      firstName: field('First name'), lastName: field('Last name', 'text', { required: true }),
      company: field('Company', 'text', { required: true }), email: field('Email', 'email'),
      phone: field('Phone', 'tel'), status: field('Status', 'select', { options: ['New', 'Working', 'Qualified', 'Unqualified', 'Converted'] }),
      leadSource: field('Lead source', 'select', { options: ['Website', 'Referral', 'Webinar', 'Partner', 'Outbound'] }),
      rating: field('Rating', 'select', { options: ['Hot', 'Warm', 'Cold'] }),
      industry: field('Industry'), ownerId: field('Owner', 'owner')
    }
  },
  accounts: {
    label: 'Accounts',
    singular: 'Account',
    table: 'accounts',
    fields: {
      name: field('Account name', 'text', { required: true }), industry: field('Industry'),
      website: field('Website'), phone: field('Phone', 'tel'), annualRevenue: field('Annual revenue', 'number'),
      billingCity: field('Billing city'), ownerId: field('Owner', 'owner')
    }
  },
  contacts: {
    label: 'Contacts',
    singular: 'Contact',
    table: 'contacts',
    fields: {
      firstName: field('First name'), lastName: field('Last name', 'text', { required: true }),
      email: field('Email', 'email'), phone: field('Phone', 'tel'), title: field('Job title'),
      accountId: field('Account ID'), ownerId: field('Owner', 'owner')
    }
  },
  opportunities: {
    label: 'Opportunities',
    singular: 'Opportunity',
    table: 'opportunities',
    fields: {
      name: field('Opportunity name', 'text', { required: true }), accountId: field('Account ID', 'text', { required: true }),
      stageName: field('Stage', 'select', { options: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] }),
      amount: field('Amount', 'number'), closeDate: field('Close date', 'date', { required: true }),
      probability: field('Probability (%)', 'number'), ownerId: field('Owner', 'owner')
    }
  },
  cases: {
    label: 'Cases',
    singular: 'Case',
    table: 'cases',
    fields: {
      subject: field('Subject', 'text', { required: true }), description: field('Description', 'text'),
      accountId: field('Account ID'), contactId: field('Contact ID'),
      status: field('Status', 'select', { options: ['New', 'Working', 'Escalated', 'Closed'] }),
      priority: field('Priority', 'select', { options: ['Low', 'Medium', 'High', 'Critical'] }),
      origin: field('Origin', 'select', { options: ['Phone', 'Email', 'Web', 'Chat'] }),
      ownerId: field('Owner', 'owner')
    }
  },
  tasks: {
    label: 'Tasks',
    singular: 'Task',
    table: 'tasks',
    fields: {
      subject: field('Subject', 'text', { required: true }),
      status: field('Status', 'select', { options: ['Not Started', 'In Progress', 'Completed'] }),
      priority: field('Priority', 'select', { options: ['Low', 'Normal', 'High'] }),
      activityDate: field('Due date', 'date'), relatedToId: field('Related record ID'), ownerId: field('Owner', 'owner')
    }
  }
};

