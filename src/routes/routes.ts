import { lazy } from 'react';

// Lazy load components
const Dashboard = lazy(() => import('../components/pages/Dashboard'));
const Members = lazy(() => import('../components/pages/Members'));
const WalkIns = lazy(() => import('../components/pages/WalkIns'));
const Staff = lazy(() => import('../components/pages/Staff'));
const Settings = lazy(() => import('../components/pages/Settings'));
const LoginPage = lazy(() => import('../components/auth/LoginPage'));
const Unauthorized = lazy(() => import('../components/pages/Unauthorized'));

export interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.FC>;
  allowedRoles: ('admin' | 'manager' | 'receptionist')[];
  label: string;
  showInNav: boolean;
}

export const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    component: Dashboard,
    allowedRoles: ['admin', 'manager', 'receptionist'],
    label: 'Dashboard',
    showInNav: true,
  },
  {
    path: '/members',
    component: Members,
    allowedRoles: ['admin', 'manager', 'receptionist'],
    label: 'Members',
    showInNav: true,
  },
  {
    path: '/walk-ins',
    component: WalkIns,
    allowedRoles: ['admin', 'manager', 'receptionist'],
    label: 'Walk-ins',
    showInNav: true,
  },
  {
    path: '/staff',
    component: Staff,
    allowedRoles: ['admin', 'manager'],
    label: 'Staff',
    showInNav: true,
  },
  {
    path: '/settings',
    component: Settings,
    allowedRoles: ['admin'],
    label: 'Settings',
    showInNav: true,
  },
  {
    path: '/login',
    component: LoginPage,
    allowedRoles: [],
    label: 'Login',
    showInNav: false,
  },
  {
    path: '/unauthorized',
    component: Unauthorized,
    allowedRoles: [],
    label: 'Unauthorized',
    showInNav: false,
  },
]; 