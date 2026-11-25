import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { HubRounded, LockOpenRounded } from '@mui/icons-material';
import { demoUsers } from '../data/userPermission.js';

export default function LoginScreen({ onLogin }) {
  return (
    <Box className="login-screen">
      <Card className="login-card">
        <CardContent>
          <div className="brand-mark"><HubRounded /></div>
          <Typography variant="h4" fontWeight={750} mt={2}>Northstar CRM</Typography>
          <Typography color="text.secondary" mt={1} mb={3}>Choose a demo role to explore its workspace.</Typography>
          <Stack spacing={1.2}>
            {demoUsers.map((user) => (
              <Button key={user.id} className="role-login" variant="outlined" onClick={() => onLogin(user)}>
                <span className="avatar-dot" style={{ backgroundColor: user.color }}>{user.initials}</span>
                <span className="role-copy"><strong>{user.title}</strong><small>{user.name}</small></span>
                <LockOpenRounded className="role-lock" fontSize="small" />
              </Button>
            ))}
          </Stack>
          <Typography className="demo-notice" color="text.secondary">
            Demo role switch only - this screen is not secure authentication.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
