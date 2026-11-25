import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, List, ListItem, ListItemText,
  MenuItem, Paper, Snackbar, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography
} from '@mui/material';
import { AddRounded, CloseRounded, DeleteOutlineRounded, EditOutlined, SearchRounded, VisibilityRounded, HistoryRounded } from '@mui/icons-material';
import { can, demoUsers } from '../data/userPermission.js';
import { displayColumns, formatColumn, resourceFields } from '../data/resourceFields.js';
import { convertLead, createRecord, deleteRecord, getOpportunityHistory, listRecords, submitOpportunityApproval, updateRecord } from '../sdk/crmService.js';

const emptyValues = (fields) => Object.fromEntries(Object.keys(fields).map((key) => [key, '']));
const displayValue = (value) => value == null || value === '' ? '-' : String(value);

export default function ResourcePage({ resource, user, onOpenCustomer }) {
  const config = resourceFields[resource];
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [values, setValues] = useState(emptyValues(config.fields));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conversion, setConversion] = useState(null);
  const [converting, setConverting] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(null);
  const readOnly = !can(user.role, resource, 'C') && !can(user.role, resource, 'U') && !can(user.role, resource, 'D');
  const hasActions = !readOnly || (resource === 'accounts' && Boolean(onOpenCustomer));

  const load = useCallback(async () => {
    setRecords(await listRecords(resource, user.role));
  }, [resource, user.role]);

  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? records.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term))) : records;
  }, [records, search]);
  const columns = useMemo(() => displayColumns[resource].filter((column) => (
    column !== 'annualRevenue' || !['sales', 'support'].includes(user.role)
  )), [resource, user.role]);

  const openNew = () => {
    setValues(emptyValues(config.fields));
    setDialog({ mode: 'create' });
  };
  const openEdit = (row) => {
    setValues(Object.fromEntries(Object.keys(config.fields).map((key) => [key, row[key] ?? ''])));
    setDialog({ mode: 'edit', row });
  };
  const save = async () => {
    setBusy(true);
    try {
      const payload = Object.fromEntries(Object.entries(values).filter(([key, value]) => (
        value !== '' && !config.fields[key]?.systemManaged
      )));
      if (dialog.mode === 'create') await createRecord(resource, payload);
      else await updateRecord(resource, dialog.row.id, payload);
      setDialog(null);
      setMessage(`${config.singular} saved`);
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete this ${config.singular.toLowerCase()}?`)) return;
    try {
      await deleteRecord(resource, row.id);
      setMessage(`${config.singular} deleted`);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };
  const convert = async (row) => {
    try {
      const accounts = await listRecords('accounts', user.role);
      setConversion({ lead: row, accounts, accountId: '', result: null });
    } catch (error) {
      setMessage(error.message);
    }
  };
  const confirmConvert = async () => {
    setConverting(true);
    try {
      const result = await convertLead(conversion.lead.id, conversion.accountId || undefined);
      setConversion({ ...conversion, result });
      setMessage('Lead conversion completed');
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setConverting(false);
    }
  };
  const handleApproval = async (row, decision) => {
    try {
      await submitOpportunityApproval(row.id, decision);
      setMessage(decision === 'request' ? 'Manager approval requested' : `Approval ${decision === 'approve' ? 'approved' : 'rejected'}`);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };
  const showOpportunityHistory = async (row) => {
    try {
      setHistoryDialog({ row, entries: await getOpportunityHistory(row.id) });
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <Box>
      <div className="page-heading">
        <Box><Typography variant="h4" fontWeight={750}>{config.title}</Typography><Typography color="text.secondary">Manage {config.title.toLowerCase()} in your role-accessible workspace.</Typography></Box>
        {can(user.role, resource, 'C') && <Button variant="contained" startIcon={<AddRounded />} onClick={openNew}>New {config.singular}</Button>}
      </div>
      <Paper className="table-card">
        <Box className="table-toolbar">
          <TextField size="small" placeholder={`Search ${config.title.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <SearchRounded fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }} />
          <Typography variant="body2" color="text.secondary">{rows.length} records</Typography>
        </Box>
        {readOnly && <Alert severity="info" sx={{ mx: 2, mb: 1 }}>This role can view these records, but cannot make changes.</Alert>}
        <Box className="table-scroll">
          <Table size="small">
            <TableHead><TableRow>{columns.map((column) => <TableCell key={column}>{formatColumn(column)}</TableCell>)}{hasActions && <TableCell align="right">Actions</TableCell>}</TableRow></TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow hover key={row.id}>
                  {columns.map((column) => <TableCell key={column}>{['status', 'stageName', 'priority', 'approvalStatus', 'escalationStatus'].includes(column)
                    ? <Chip size="small" label={displayValue(row[column])} className={`status-chip ${String(row[column]).toLowerCase().replace(/\s/g, '-')}`} />
                      : displayValue(['amount', 'annualRevenue'].includes(column) ? Number(row[column] || 0).toLocaleString() : row[column])}</TableCell>)}
                  {hasActions && <TableCell align="right" className="row-actions">
                    {resource === 'accounts' && onOpenCustomer && <Tooltip title="Customer 360"><IconButton size="small" onClick={() => onOpenCustomer(row)}><VisibilityRounded fontSize="small" /></IconButton></Tooltip>}
                    {!readOnly && resource === 'leads' && row.status === 'Qualified' && can(user.role, resource, 'U') && <Button size="small" onClick={() => convert(row)}>Convert</Button>}
                    {!readOnly && resource === 'opportunities' && can(user.role, resource, 'U') && !['Closed Won', 'Closed Lost'].includes(row.stageName) && !['Pending', 'Approved'].includes(row.approvalStatus) && <Button size="small" onClick={() => handleApproval(row, 'request')}>Request approval</Button>}
                    {!readOnly && resource === 'opportunities' && ['admin', 'manager'].includes(user.role) && row.approvalStatus === 'Pending' && <>
                      <Button size="small" color="success" onClick={() => handleApproval(row, 'approve')}>Approve</Button>
                      <Button size="small" color="error" onClick={() => handleApproval(row, 'reject')}>Reject</Button>
                    </>}
                    {resource === 'opportunities' && <Tooltip title="Opportunity history"><IconButton size="small" onClick={() => showOpportunityHistory(row)}><HistoryRounded fontSize="small" /></IconButton></Tooltip>}
                    {can(user.role, resource, 'U') && <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)}><EditOutlined fontSize="small" /></IconButton></Tooltip>}
                    {can(user.role, resource, 'D') && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => remove(row)}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>}
                  </TableCell>}
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="empty-table">No records found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
      </Paper>
      <Dialog open={Boolean(dialog)} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog?.mode === 'create' ? `New ${config.singular}` : `Edit ${config.singular}`}<IconButton onClick={() => setDialog(null)} sx={{ position: 'absolute', right: 12, top: 10 }}><CloseRounded /></IconButton></DialogTitle>
        <DialogContent className="form-grid">
          {Object.entries(config.fields).filter(([key, meta]) => !meta.systemManaged && (key !== 'annualRevenue' || !['sales', 'support'].includes(user.role))).map(([key, meta]) => meta.type === 'user' ? (
            <TextField key={key} select label={meta.label} value={values[key] ?? ''} onChange={(event) => setValues({ ...values, [key]: event.target.value })}>
              <MenuItem value="">Current user (default)</MenuItem>
              {demoUsers.map((demoUser) => <MenuItem key={demoUser.id} value={demoUser.id}>{demoUser.name}</MenuItem>)}
            </TextField>
          ) : meta.type === 'select' ? (
            <TextField key={key} select label={meta.label} value={values[key] ?? ''} required={meta.required} onChange={(event) => setValues({ ...values, [key]: event.target.value })}>
              {meta.options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
            </TextField>
          ) : <TextField key={key} label={meta.label} type={meta.type || 'text'} multiline={meta.multiline} minRows={meta.multiline ? 3 : undefined} required={meta.required || (resource === 'cases' && key === 'resolutionDate' && ['Resolved', 'Closed'].includes(values.status))} value={values[key] ?? ''} inputProps={meta.type === 'number' ? { min: 0, step: 'any' } : undefined} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />)}
        </DialogContent>
        <DialogActions><Button onClick={() => setDialog(null)}>Cancel</Button><Button variant="contained" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(conversion)} onClose={() => !converting && setConversion(null)} fullWidth maxWidth="sm">
        <DialogTitle>{conversion?.result ? 'Lead conversion complete' : 'Convert qualified lead'}</DialogTitle>
        <DialogContent>
          {conversion?.result ? <>
            <DialogContentText mb={2}>{conversion.result.reusedAccount ? 'An existing Account was reused.' : 'A new Account was created.'}</DialogContentText>
            <Typography><strong>Account:</strong> {conversion.result.Account?.Name} ({conversion.result.Account?.Id})</Typography>
            <Typography><strong>Contact:</strong> {[conversion.result.Contact?.FirstName, conversion.result.Contact?.LastName].filter(Boolean).join(' ')} ({conversion.result.Contact?.Id})</Typography>
            <Typography><strong>Opportunity:</strong> {conversion.result.Opportunity?.Name} ({conversion.result.Opportunity?.Id})</Typography>
            <Typography><strong>Converted:</strong> {conversion.result.conversionDate ? new Date(conversion.result.conversionDate).toLocaleString() : '—'}</Typography>
          </> : <>
            <DialogContentText mb={2}>A Contact and Opportunity will be created and the Lead will be marked Converted. You may select an existing Account, or let the simulator match the company name and create an Account if needed.</DialogContentText>
            <TextField select fullWidth label="Account" value={conversion?.accountId || ''} onChange={(event) => setConversion({ ...conversion, accountId: event.target.value })}>
              <MenuItem value="">Match company automatically</MenuItem>
              {conversion?.accounts.map((account) => <MenuItem key={account.id} value={account.id}>{account.name}</MenuItem>)}
            </TextField>
          </>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConversion(null)}>{conversion?.result ? 'Close' : 'Cancel'}</Button>
          {!conversion?.result && <Button variant="contained" disabled={converting} onClick={confirmConvert}>{converting ? 'Converting…' : 'Confirm conversion'}</Button>}
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(historyDialog)} onClose={() => setHistoryDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>Opportunity history · {historyDialog?.row.name}</DialogTitle>
        <DialogContent>
          {historyDialog?.entries.length ? <List dense>{historyDialog.entries.map((entry) => (
            <ListItem key={entry.Id} divider>
              <ListItemText
                primary={entry.approvalStatus
                  ? `Approval ${entry.approvalStatus}`
                  : `${entry.fromStage || 'Created'} → ${entry.toStage}`}
                secondary={`${entry.ActorName} · ${new Date(entry.at).toLocaleString()}${entry.probability == null ? '' : ` · Probability ${entry.probability}%`}`}
              />
            </ListItem>
          ))}</List> : <DialogContentText>No stage or approval history recorded yet.</DialogContentText>}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistoryDialog(null)}>Close</Button></DialogActions>
      </Dialog>
      <Snackbar open={Boolean(message)} autoHideDuration={4500} onClose={() => setMessage('')}><Alert severity={message.includes('denied') || message.includes('required') || message.includes('valid') ? 'error' : 'info'} onClose={() => setMessage('')}>{message}</Alert></Snackbar>
    </Box>
  );
}
