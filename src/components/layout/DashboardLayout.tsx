import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  DirectionsWalk as WalkInsIcon,
  Group as StaffIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { routes } from '../../routes/routes';

const DRAWER_WIDTH = 240;

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userRole, loading, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleProfileMenuClose();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
      // You might want to show an error message to the user here
    }
  };

  const getIcon = (label: string) => {
    switch (label) {
      case 'Dashboard':
        return <DashboardIcon />;
      case 'Members':
        return <PeopleIcon />;
      case 'Walk-ins':
        return <WalkInsIcon />;
      case 'Staff':
        return <StaffIcon />;
      case 'Settings':
        return <SettingsIcon />;
      default:
        return <DashboardIcon />;
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          AFG Management
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {routes
          .filter((route) => route.showInNav && (!route.allowedRoles.length || 
            (userRole && route.allowedRoles.includes(userRole))))
          .map((route) => (
            <ListItem
              button
              key={route.path}
              onClick={() => {
                navigate(route.path);
                if (isMobile) {
                  handleDrawerToggle();
                }
              }}
              selected={location.pathname === route.path}
            >
              <ListItemIcon>{getIcon(route.label)}</ListItemIcon>
              <ListItemText primary={route.label} />
            </ListItem>
          ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {routes.find((route) => route.path === location.pathname)?.label || 'Dashboard'}
          </Typography>
          <IconButton color="inherit">
            <NotificationsIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={handleProfileMenuOpen}
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {currentUser?.email?.[0].toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
        }}
      >
        {children}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DashboardLayout; 