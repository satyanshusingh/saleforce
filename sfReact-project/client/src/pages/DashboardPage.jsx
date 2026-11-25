import { useEffect, useState } from 'react';
import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import { BusinessRounded, MonetizationOnRounded, SupportAgentRounded, TrendingUpRounded } from '@mui/icons-material';
import StatCard from '../components/StatCard.jsx';
import { getDashboardData } from '../sdk/crmService.js';

const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0);

export default function DashboardPage({ user }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getDashboardData(user).then(setOverview).catch((reason) => setError(reason.message));
  }, [user.id]);

  return (
    <Box>
      <div className="page-heading"><Box><Typography variant="h4" fontWeight={750}>Good morning, {user.name.split(' ')[0]}</Typography><Typography color="text.secondary">Here's the latest view of your customer operations.</Typography></Box></div>
      {error && <Typography color="error">{error}</Typography>}
      {!overview ? <LinearProgress /> : <>
        <div className="stats-grid">
          <StatCard label="Open pipeline" value={money(overview.pipeline)} note={`Weighted ${money(overview.weighted)}`} icon={TrendingUpRounded} tone="blue" />
          <StatCard label="Closed won" value={money(overview.won)} note="Total won opportunity value" icon={MonetizationOnRounded} tone="green" />
          <StatCard label="Accounts" value={overview.totalAccounts} note={`${overview.totalContacts} contacts`} icon={BusinessRounded} tone="purple" />
          <StatCard label="Open cases" value={overview.openCases} note={`${overview.overdueTasks} overdue tasks`} icon={SupportAgentRounded} tone="orange" />
        </div>
        <div className="dashboard-grid">
          <Card className="dashboard-panel">
            <CardContent>
              <Typography variant="h6" fontWeight={700}>Opportunity pipeline</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Value and volume by stage</Typography>
              {overview.breakdown.map((stage) => {
                const max = Math.max(...overview.breakdown.map((item) => item.amount), 1);
                return <div className="stage-row" key={stage.stage}>
                  <div className="stage-label"><strong>{stage.stage}</strong><span>{stage.count} deals · {money(stage.amount)}</span></div>
                  <LinearProgress variant="determinate" value={stage.amount / max * 100} />
                </div>;
              })}
            </CardContent>
          </Card>
          <Card className="dashboard-panel">
            <CardContent>
              <Typography variant="h6" fontWeight={700}>At a glance</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>Your accessible CRM activity</Typography>
              <div className="quick-metric"><span>Active leads</span><strong>{overview.unconvertedLeads}</strong></div>
              <div className="quick-metric"><span>Contacts</span><strong>{overview.totalContacts}</strong></div>
              <div className="quick-metric"><span>Tasks overdue</span><strong className={overview.overdueTasks ? 'text-warning' : ''}>{overview.overdueTasks}</strong></div>
              <div className="quick-metric"><span>My role</span><strong>{user.title}</strong></div>
            </CardContent>
          </Card>
        </div>
      </>}
    </Box>
  );
}
