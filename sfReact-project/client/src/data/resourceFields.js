const text = (label) => ({ label, type: 'text' });
const select = (label, options) => ({ label, type: 'select', options });

export const resourceFields = {
  leads: {
    title: 'Leads', singular: 'Lead', fields: {
      firstName: text('First name'), lastName: { ...text('Last name'), required: true },
      company: { ...text('Company'), required: true }, email: { ...text('Email'), type: 'email' },
      phone: { ...text('Phone'), type: 'tel' }, status: select('Status', ['New', 'Working', 'Qualified', 'Unqualified']),
      leadSource: select('Lead source', ['Website', 'Referral', 'Webinar', 'Partner', 'Outbound']),
      rating: select('Rating', ['Hot', 'Warm', 'Cold']), industry: text('Industry'),
      convertedAccountId: { ...text('Converted account'), systemManaged: true },
      convertedContactId: { ...text('Converted contact'), systemManaged: true },
      convertedOpportunityId: { ...text('Converted opportunity'), systemManaged: true },
      conversionDate: { ...text('Conversion date'), systemManaged: true }
    }
  },
  accounts: {
    title: 'Accounts', singular: 'Account', fields: {
      name: { ...text('Account name'), required: true }, accountNumber: text('Account number'),
      industry: text('Industry'), phone: { ...text('Phone'), type: 'tel' },
      email: { ...text('Email'), type: 'email' }, website: text('Website'),
      billingStreet: text('Billing street'), billingCity: text('Billing city'),
      billingState: text('Billing state'), billingPostalCode: text('Billing postal code'),
      billingCountry: text('Billing country'), shippingStreet: text('Shipping street'),
      shippingCity: text('Shipping city'), shippingState: text('Shipping state'),
      shippingPostalCode: text('Shipping postal code'), shippingCountry: text('Shipping country'),
      status: select('Status', ['Active', 'Inactive']),
      annualRevenue: { ...text('Annual revenue'), type: 'number' },
      ownerId: { ...text('Owner'), type: 'user' }
    }
  },
  contacts: {
    title: 'Contacts', singular: 'Contact', fields: {
      firstName: text('First name'), lastName: { ...text('Last name'), required: true },
      email: { ...text('Email'), type: 'email' }, phone: { ...text('Phone'), type: 'tel' },
      title: text('Job title'), accountId: text('Account ID')
    }
  },
  opportunities: {
    title: 'Opportunities', singular: 'Opportunity', fields: {
      name: { ...text('Opportunity name'), required: true }, accountId: { ...text('Account ID'), required: true },
      stageName: select('Stage', ['Prospecting', 'Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']),
      amount: { ...text('Amount'), type: 'number' }, closeDate: { ...text('Close date'), type: 'date', required: true },
      probability: { ...text('Probability (%)'), type: 'number', systemManaged: true },
      approvalStatus: { ...text('Approval status'), systemManaged: true },
      approvedById: { ...text('Approved by'), systemManaged: true },
      approvedAt: { ...text('Approved at'), systemManaged: true }
    }
  },
  cases: {
    title: 'Cases', singular: 'Case', fields: {
      subject: { ...text('Subject'), required: true }, description: { ...text('Description'), multiline: true },
      accountId: text('Account ID'), contactId: text('Contact ID'),
      status: select('Status', ['New', 'Working', 'Escalated', 'Resolved', 'Closed']),
      priority: select('Priority', ['Low', 'Medium', 'High', 'Critical']),
      origin: select('Origin', ['Phone', 'Email', 'Web', 'Chat']),
      resolutionDate: { ...text('Resolution date'), type: 'date' },
      escalationStatus: { ...text('Escalation status'), systemManaged: true },
      escalatedAt: { ...text('Escalated at'), systemManaged: true },
      slaBreachedAt: { ...text('SLA breached at'), systemManaged: true }
    }
  },
  tasks: {
    title: 'Tasks', singular: 'Task', fields: {
      subject: { ...text('Subject'), required: true },
      status: select('Status', ['Not Started', 'In Progress', 'Completed']),
      priority: select('Priority', ['Low', 'Normal', 'High']),
      activityDate: { ...text('Due date'), type: 'date' }, relatedToId: text('Related record ID'),
      escalationForCaseId: { ...text('Escalation case ID'), systemManaged: true },
      completedAt: { ...text('Completed at'), systemManaged: true },
      completedById: { ...text('Completed by'), systemManaged: true }
    }
  }
};

export const displayColumns = {
  leads: ['firstName', 'lastName', 'company', 'status', 'rating', 'convertedAccountId'],
  accounts: ['name', 'accountNumber', 'industry', 'billingCity', 'status', 'annualRevenue', 'ownerId'],
  contacts: ['firstName', 'lastName', 'email', 'title', 'accountId'],
  opportunities: ['name', 'stageName', 'amount', 'probability', 'approvalStatus', 'closeDate'],
  cases: ['caseNumber', 'subject', 'status', 'priority', 'escalationStatus', 'resolutionDate'],
  tasks: ['subject', 'status', 'priority', 'activityDate', 'ownerId']
};

export const formatColumn = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
