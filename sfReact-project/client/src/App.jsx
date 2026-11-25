import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import AppLayout from './components/AppLayout.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import ResourcePage from './components/ResourcePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import { AuditPage, SecurityPage } from './pages/InsightsPages.jsx';
import Customer360Page from './pages/Customer360Page.jsx';
import { api, setCurrentDemoUser } from './api/client.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [customerAccount, setCustomerAccount] = useState(null);
  const [dataStatus, setDataStatus] = useState('loading');
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    let active = true;
    setDataStatus('loading');
    setDataError('');
    api('/health')
      .then(() => {
        if (active) setDataStatus('ready');
      })
      .catch((reason) => {
        if (active) {
          setDataError(reason.message);
          setDataStatus('error');
        }
      });
    return () => { active = false; };
  }, []);

  const login = (selectedUser) => {
    setCurrentDemoUser(selectedUser.id);
    setUser(selectedUser);
  };
  const logout = () => {
    setCurrentDemoUser('u1');
    setUser(null);
    setPage('dashboard');
  };

  if (dataStatus === 'loading') {
    return (
      <Box className="data-loading-screen">
        <CircularProgress size={38} thickness={4} />
        <Typography fontWeight={700} mt={2}>Preparing CRM data</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Connecting to the workspace...</Typography>
      </Box>
    );
  }

  if (dataStatus === 'error') {
    return (
      <Box className="data-loading-screen">
        <Alert severity="error" sx={{ width: 'min(420px, 100%)' }}>{dataError}</Alert>
      </Box>
    );
  }

  if (!user) return <LoginScreen onLogin={login} />;

  let content;
  if (page === 'dashboard') content = <DashboardPage user={user} />;
  else if (['leads', 'accounts', 'contacts', 'opportunities', 'cases', 'tasks'].includes(page)) {
    content = <ResourcePage
      key={`${page}-${user.id}`}
      resource={page}
      user={user}
      onOpenCustomer={(account) => { setCustomerAccount(account); setPage('customer360'); }}
    />;
  }
  else if (page === 'customer360' && customerAccount) content = <Customer360Page accountId={customerAccount.id} onBack={() => setPage('accounts')} />;
  else if (page === 'security') content = <SecurityPage user={user} />;
  else if (page === 'audit') content = <AuditPage user={user} />;

  return (
    <AppLayout user={user} page={page} setPage={setPage} onLogout={logout}>
      {content}
    </AppLayout>
  );
}
