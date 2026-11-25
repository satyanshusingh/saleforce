import {
  DashboardRounded, PeopleAltRounded, BusinessRounded, ContactsRounded, TrendingUpRounded,
  SupportAgentRounded, TaskAltRounded, SecurityRounded, HistoryRounded
} from '@mui/icons-material';

export const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardRounded, section: 'Overview', permission: null },
  { id: 'leads', label: 'Leads', icon: PeopleAltRounded, section: 'CRM', permission: ['leads', 'R'] },
  { id: 'accounts', label: 'Accounts', icon: BusinessRounded, section: 'CRM', permission: ['accounts', 'R'] },
  { id: 'contacts', label: 'Contacts', icon: ContactsRounded, section: 'CRM', permission: ['contacts', 'R'] },
  { id: 'opportunities', label: 'Opportunities', icon: TrendingUpRounded, section: 'CRM', permission: ['opportunities', 'R'] },
  { id: 'cases', label: 'Cases', icon: SupportAgentRounded, section: 'CRM', permission: ['cases', 'R'] },
  { id: 'tasks', label: 'Tasks', icon: TaskAltRounded, section: 'CRM', permission: ['tasks', 'R'] },
  { id: 'security', label: 'Role access', icon: SecurityRounded, section: 'Administration', permission: null },
  { id: 'audit', label: 'Audit history', icon: HistoryRounded, section: 'Administration', permission: null, managerOnly: true }
];

export const resourceLabels = {
  leads: 'Leads', accounts: 'Accounts', contacts: 'Contacts',
  opportunities: 'Opportunities', cases: 'Cases', tasks: 'Tasks'
};
