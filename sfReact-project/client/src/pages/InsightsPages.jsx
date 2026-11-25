import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, LinearProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { api } from '../api/client.js';
import { permissions } from '../data/userPermission.js';

export function SecurityPage({ user }) {
  const [data, setData] = useState(null);
  useEffect(() => { api('/security', { userId: user.id }).then(setData); }, [user.id]);
  const roles = [
    { id: 'admin', name: 'Admin' }, { id: 'manager', name: 'Sales Manager' },
    { id: 'sales', name: 'Sales Representative' }, { id: 'support', name: 'Support Agent' }
  ];
  return <Box>
    <div className="page-heading"><Box><Typography variant="h4" fontWeight={750}>Role access</Typography><Typography color="text.secondary">Screen visibility and API permissions follow the selected demo role.</Typography></Box></div>
    <Alert severity="warning" sx={{ mb: 2 }}>{data?.notes || 'This demo role selector is not a secure authentication system.'}</Alert>
    <Paper className="table-card"><Table><TableHead><TableRow><TableCell>CRM area</TableCell>{roles.map((role) => <TableCell key={role.id}>{role.name}</TableCell>)}</TableRow></TableHead><TableBody>
      {['leads', 'accounts', 'contacts', 'opportunities', 'cases', 'tasks'].map((resource) => <TableRow key={resource}><TableCell sx={{ textTransform: 'capitalize', fontWeight: 650 }}>{resource}</TableCell>{roles.map((role) => <TableCell key={role.id}>{permissions[role.id][resource] || '-'}{role.id === user.role && <Chip size="small" label="You" sx={{ ml: 1 }} />}</TableCell>)}</TableRow>)}
    </TableBody></Table></Paper>
    <Card className="dashboard-panel" sx={{ mt: 2 }}><CardContent><Typography variant="h6" fontWeight={700}>Demo safeguards</Typography><Typography color="text.secondary" mt={1}>The server checks access permissions for record operations, hides restricted account revenue fields, and applies owner visibility rules. Role selection is intentionally available for classroom demos; do not use this pattern for production authentication.</Typography></CardContent></Card>
  </Box>;
}

export function AuditPage({ user }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/audit', { userId: user.id })
      .then((data) => setRows(data.map((row) => ({
        ...row,
        action: row.operation ?? row.action,
        recordLabel: row.label ?? row.recordLabel,
        resource: row.object ?? row.resource,
        createdAt: row.at ?? row.createdAt
      }))))
      .catch((reason) => setError(reason.message));
  }, [user.id]);
  return <Box>
    <div className="page-heading"><Box><Typography variant="h4" fontWeight={750}>Audit history</Typography><Typography color="text.secondary">Recent record changes and demo user activity.</Typography></Box></div>
    {error && <Alert severity="warning">{error}</Alert>}
    {!rows ? <LinearProgress /> : <Paper className="table-card"><Table size="small"><TableHead><TableRow><TableCell>Action</TableCell><TableCell>Record</TableCell><TableCell>Resource</TableCell><TableCell>By</TableCell><TableCell>Time</TableCell></TableRow></TableHead><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><Chip size="small" label={row.action} /></TableCell><TableCell>{row.recordLabel || row.recordId}</TableCell><TableCell>{row.resource}</TableCell><TableCell>{row.actorName}</TableCell><TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell></TableRow>)}{!rows.length && <TableRow><TableCell colSpan={5} className="empty-table">No changes have been recorded.</TableCell></TableRow>}</TableBody></Table></Paper>}
  </Box>;
}
