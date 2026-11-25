import { Card, CardContent, Typography } from '@mui/material';

export default function StatCard({ label, value, note, icon: Icon, tone = 'blue' }) {
  return (
    <Card className="stat-card">
      <CardContent>
        <div className={`stat-icon ${tone}`}>{Icon && <Icon fontSize="small" />}</div>
        <Typography color="text.secondary" variant="body2" mt={2}>{label}</Typography>
        <Typography variant="h4" fontWeight={750} mt={0.4}>{value}</Typography>
        {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
      </CardContent>
    </Card>
  );
}
