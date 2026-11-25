import { useCallback, useEffect, useState } from 'react';
import {
  AppBar, Avatar, Badge, Box, Button, Divider, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Typography
} from '@mui/material';
import { LogoutRounded, MenuRounded, NotificationsRounded } from '@mui/icons-material';
import { navigation } from '../data/navigation.js';
import { can } from '../data/userPermission.js';
import { api } from '../api/client.js';

const drawerWidth = 250;

export default function AppLayout({ user, page, setPage, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');
  const refreshNotifications = useCallback(async () => {
    try {
      setNotifications(await api('/notifications', { userId: user.id }));
      setNotificationError('');
    } catch (reason) {
      setNotificationError(reason.message);
    }
  }, [user.id]);
  useEffect(() => {
    void refreshNotifications();
    const timer = setInterval(() => { void refreshNotifications(); }, 30000);
    return () => clearInterval(timer);
  }, [refreshNotifications]);
  const openNotification = async (item) => {
    try {
      await api(`/notifications/${encodeURIComponent(item.Id)}`, { userId: user.id, method: 'PATCH' });
      setNotifications((current) => current.map((notification) => notification.Id === item.Id
        ? { ...notification, readAt: notification.readAt || new Date().toISOString() }
        : notification));
      setNotificationAnchor(null);
      if (item.type.startsWith('case-')) setPage('cases');
      if (item.type.startsWith('opportunity-')) setPage('opportunities');
    } catch (reason) {
      setNotificationError(reason.message);
    }
  };
  const items = navigation.filter((item) => {
    if (item.managerOnly && !['admin', 'manager'].includes(user.role)) return false;
    return !item.permission || can(user.role, item.permission[0], item.permission[1]);
  });
  const sections = ['Overview', 'CRM', 'Administration'];
  const nav = (
    <Box className="sidebar-inner">
      <Box className="sidebar-brand">
        <div className="brand-mark small"><span>N</span></div>
        <Box><Typography fontWeight={750}>Northstar CRM</Typography><Typography variant="caption" color="text.secondary">Workspace</Typography></Box>
      </Box>
      {sections.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);
        if (!sectionItems.length) return null;
        return (
          <Box key={section} className="nav-section">
            <Typography className="nav-caption">{section}</Typography>
            <List className="nav-list">
              {sectionItems.map(({ id, label, icon: Icon }) => (
                <ListItemButton key={id} selected={page === id} onClick={() => { setPage(id); setMobileOpen(false); }}>
                  <ListItemIcon><Icon fontSize="small" /></ListItemIcon><ListItemText primary={label} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        );
      })}
      <Box className="sidebar-bottom">
        <Divider />
        <Button className="sidebar-account" onClick={onLogout}>
          <Avatar sx={{ bgcolor: user.color }}>{user.initials}</Avatar>
          <Box className="sidebar-account-copy">
            <Typography component="span" className="sidebar-account-name">{user.name}</Typography>
            <Typography component="span" variant="caption" color="text.secondary">{user.title}</Typography>
          </Box>
          <LogoutRounded fontSize="small" />
        </Button>
      </Box>
    </Box>
  );
  return (
    <Box className="app-shell">
      <AppBar className="topbar" position="fixed" elevation={0}>
        <Toolbar>
          <IconButton className="mobile-menu" onClick={() => setMobileOpen(true)}><MenuRounded /></IconButton>
          <Typography className="topbar-title">Customer Relationship Management</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton aria-label="Notifications" onClick={(event) => setNotificationAnchor(event.currentTarget)}>
            <Badge color="error" badgeContent={notifications.filter((item) => !item.readAt).length}>
              <NotificationsRounded />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={() => setNotificationAnchor(null)}
            slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } }}
          >
            {notificationError && <MenuItem disabled>{notificationError}</MenuItem>}
            {!notificationError && !notifications.length && <MenuItem disabled>No notifications</MenuItem>}
            {notifications.slice(0, 20).map((item) => (
              <MenuItem key={item.Id} onClick={() => { void openNotification(item); }} selected={!item.readAt}>
                <ListItemText
                  primary={item.message}
                  secondary={`${new Date(item.createdAt).toLocaleString()}${item.readAt ? '' : ' · New'}`}
                  primaryTypographyProps={{ noWrap: true }}
                />
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" className="desktop-nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer variant="permanent" open sx={{ '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}>{nav}</Drawer>
      </Box>
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}>{nav}</Drawer>
      <Box component="main" className="page-content" sx={{ ml: { md: `${drawerWidth}px` } }}>{children}</Box>
    </Box>
  );
}
