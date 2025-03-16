import { lazy, ComponentType } from 'react';

const Dashboard = lazy(() => import('../components/pages/Dashboard'));
const Members = lazy(() => import('../components/pages/Members'));
const Analytics = lazy(() => import('../components/pages/Analytics'));
const WalkIns = lazy(() => import('../components/pages/WalkIns'));

export interface Route {
  path: string;
  component: React.LazyExoticComponent<ComponentType<any>>;
  allowedRoles: string[];
  label: string;
  showInNav: boolean;
}

const routes: Route[] = [
  {
    path: '/',
    component: Dashboard,
    allowedRoles: ['admin', 'manager', 'staff'],
    label: 'Dashboard',
    showInNav: true,
  },
  {
    path: '/members',
    component: Members,
    allowedRoles: ['admin', 'manager', 'staff'],
    label: 'Members',
    showInNav: true,
  },
  {
    path: '/analytics',
    component: Analytics,
    allowedRoles: ['admin', 'manager'],
    label: 'Analytics',
    showInNav: true,
  },
  {
    path: '/walk-ins',
    component: WalkIns,
    allowedRoles: ['admin', 'manager', 'staff'],
    label: 'Walk-ins',
    showInNav: true,
  },
];

export default routes; 