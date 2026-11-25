import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, MenuItem,
  Paper, Table, TableBody, TableCell, TableHead, TablePagination, TableRow,
  Tabs, Tab, TextField, Typography
} from '@mui/material';
import { ArrowBackRounded, RefreshRounded } from '@mui/icons-material';
import { getAccount360 } from '../sdk/crmService.js';

const tabs = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'cases', label: 'Cases' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'activity', label: 'Timeline' }
];
const columns = {
  contacts: ['FirstName', 'LastName', 'Title', 'Email', 'Phone'],
  opportunities: ['Name', 'StageName', 'Amount', 'Probability', 'CloseDate', 'ApprovalStatus'],
  cases: ['CaseNumber', 'Subject', 'Status', 'Priority', 'EscalationStatus', 'SlaBreachedAt'],
  tasks: ['Subject', 'Status', 'Priority', 'ActivityDate', 'OwnerId'],
  activity: ['operation', 'object', 'label', 'actorName', 'at']
};
const labels = {
  FirstName: 'First name', LastName: 'Last name', StageName: 'Stage',
  Amount: 'Amount', Probability: 'Probability', CloseDate: 'Close date',
  ApprovalStatus: 'Approval', CaseNumber: 'Case #', EscalationStatus: 'Escalation',
  SlaBreachedAt: 'SLA breached', ActivityDate: 'Due date', OwnerId: 'Owner',
  actorName: 'User', operation: 'Action', object: 'Record type', label: 'Record', at: 'Time'
};
const display = (row, key) => {
  const value = row?.[key];
  if (value == null || value === '') return '—';
  if (key === 'Amount') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);
  if (key === 'at' || key === 'SlaBreachedAt') return new Date(value).toLocaleString();
  return String(value);
};

function Metric({ label, value, detail }) {
  return <Card variant="outlined"><CardContent>
    <Typography variant="overline" color="text.secondary">{label}</Typography>
    <Typography variant="h5" fontWeight={750}>{value}</Typography>
    {detail && <Typography variant="body2" color="text.secondary">{detail}</Typography>}
  </CardContent></Card>;
}

export default function Customer360Page({ accountId, onBack }) {
  const [tab, setTab] = useState('contacts');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setError('');
      setData(await getAccount360(accountId, { tab, q: search, status: statusFilter, page, pageSize }));
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, [accountId, tab, search, statusFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(true); }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => { void load(); }, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const changeTab = (_event, nextTab) => {
    setTab(nextTab);
    setPage(1);
  };
  const account = data?.account;
  const summary = data?.summary;
  const tabConfig = tabs.find((item) => item.id === tab);
  const statusOptions = tab === 'opportunities'
    ? ['Prospecting', 'Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']
    : tab === 'cases' ? ['New', 'Working', 'Escalated', 'Resolved', 'Closed']
      : tab === 'tasks' ? ['Not Started', 'In Progress', 'Completed'] : [];

  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
      <Box>
        <Button startIcon={<ArrowBackRounded />} onClick={onBack}>Back to Accounts</Button>
        <Typography variant="h4" fontWeight={750} mt={1}>{account?.Name || 'Customer 360'}</Typography>
        <Typography color="text.secondary">Account profile, relationships, service health, and activity.</Typography>
      </Box>
      <Button variant="outlined" startIcon={<RefreshRounded />} onClick={() => { void load(true); }}>Refresh</Button>
    </Box>

    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {loading && !data ? <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><CircularProgress /></Box> : data && <>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip color={data.healthStatus === 'Healthy' ? 'success' : data.healthStatus === 'At Risk' ? 'error' : 'warning'} label={`Account health: ${data.healthStatus}`} />
        <Chip variant="outlined" label={`Account # ${account.AccountNumber || '—'}`} />
        <Chip variant="outlined" label={`Status: ${account.Status || 'Active'}`} />
        <Chip variant="outlined" label={`Modified: ${account.LastModifiedDate ? new Date(account.LastModifiedDate).toLocaleString() : '—'}`} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
        <Metric label="Open opportunities" value={summary.openOpportunities} detail={`Pipeline $${Number(summary.openPipeline || 0).toLocaleString()}`} />
        <Metric label="Weighted forecast" value={`$${Number(summary.weightedForecast || 0).toLocaleString()}`} />
        <Metric label="Open cases" value={summary.openCases} />
        <Metric label="Pending tasks" value={summary.pendingTasks} detail={`${summary.overdueTasks} overdue`} />
        <Metric label="Case escalations" value={summary.caseEscalations} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
        <Card variant="outlined"><CardContent>
          <Typography variant="h6" fontWeight={700} mb={1}>Account information</Typography>
          <Typography><strong>Industry:</strong> {account.Industry || '—'}</Typography>
          <Typography><strong>Phone:</strong> {account.Phone || '—'}</Typography>
          <Typography><strong>Email:</strong> {account.Email || '—'}</Typography>
          <Typography><strong>Website:</strong> {account.Website || '—'}</Typography>
          <Typography><strong>Owner:</strong> {account.OwnerId || '—'}</Typography>
        </CardContent></Card>
        <Card variant="outlined"><CardContent>
          <Typography variant="h6" fontWeight={700} mb={1}>Billing and shipping</Typography>
          <Typography><strong>Billing:</strong> {[account.BillingStreet, account.BillingCity, account.BillingState, account.BillingPostalCode, account.BillingCountry].filter(Boolean).join(', ') || '—'}</Typography>
          <Typography><strong>Shipping:</strong> {[account.ShippingStreet, account.ShippingCity, account.ShippingState, account.ShippingPostalCode, account.ShippingCountry].filter(Boolean).join(', ') || '—'}</Typography>
          <Typography><strong>Created:</strong> {account.CreatedDate ? new Date(account.CreatedDate).toLocaleString() : '—'}</Typography>
        </CardContent></Card>
      </Box>

      <Paper variant="outlined">
        <Tabs value={tab} onChange={changeTab} variant="scrollable" scrollButtons="auto">
          {tabs.map((item) => <Tab key={item.id} value={item.id} label={`${item.label} (${data.relatedCounts[item.id] ?? 0})`} />)}
        </Tabs>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>{tabConfig?.label}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField size="small" label={`Search ${tabConfig?.label}`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            {statusOptions.length > 0 && <TextField select size="small" label="Filter status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} sx={{ minWidth: 170 }}>
              <MenuItem value="">All statuses</MenuItem>
              {statusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
            </TextField>}
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow>{(columns[tab] || []).map((key) => <TableCell key={key}>{labels[key] || key}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {data.rows.map((row) => <TableRow key={row.Id || row.id}>
                {(columns[tab] || []).map((key) => <TableCell key={key}>{display(row, key)}</TableCell>)}
              </TableRow>)}
              {!data.rows.length && <TableRow><TableCell colSpan={columns[tab].length}>No related {tabConfig?.label.toLowerCase()} found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={data.total}
          page={Math.max(0, data.page - 1)}
          onPageChange={(_event, nextPage) => setPage(nextPage + 1)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={1}>Case escalation timeline</Typography>
          {data.escalationTimeline.length ? data.escalationTimeline.slice(0, 8).map((event) => (
            <Box key={event.Id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography fontWeight={650}>{event.action.replaceAll('_', ' ')}</Typography>
              <Typography variant="body2" color="text.secondary">{event.details} · {event.ActorName} · {new Date(event.at).toLocaleString()}</Typography>
            </Box>
          )) : <Typography color="text.secondary">No escalation events for this account.</Typography>}
        </CardContent>
      </Card>
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>Auto-refreshes every 15 seconds.</Typography>
    </>}
  </Box>;
}
