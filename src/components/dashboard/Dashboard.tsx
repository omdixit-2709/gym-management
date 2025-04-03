import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  useTheme,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Stack,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import GroupsIcon from '@mui/icons-material/Groups';
import NotificationsIcon from '@mui/icons-material/Notifications';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { RootState } from '../../store';
import { 
  fetchDashboardMetrics, 
  setDateRange, 
  setupDashboardListeners,
  markNotificationsAsRead,
  updateLastUpdated 
} from '../../store/slices/dashboardSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { 
    metrics, 
    loading, 
    error, 
    dateRange,
    lastUpdated,
    unreadNotifications 
  } = useSelector((state: RootState) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardMetrics(dateRange));
    let cleanup: (() => void) | undefined;
    
    const setupListeners = async () => {
      try {
        const result = await dispatch(setupDashboardListeners()).unwrap();
        if (typeof result === 'function') {
          cleanup = result;
        }
      } catch (error) {
        console.error('Failed to setup dashboard listeners:', error);
      }
    };

    setupListeners();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [dispatch, dateRange]);

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      dispatch(
        setDateRange({
          ...dateRange,
          [field]: date.toISOString(),
        })
      );
    }
  };

  const handleRefresh = () => {
    dispatch(fetchDashboardMetrics(dateRange));
    dispatch(updateLastUpdated());
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const renderTrendIndicator = (current: number, previous: number) => {
    const trend = calculateTrend(current, previous);
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        {trend > 0 ? (
          <TrendingUpIcon sx={{ color: theme.palette.success.main }} />
        ) : (
          <TrendingDownIcon sx={{ color: theme.palette.error.main }} />
        )}
        <Typography
          variant="body2"
          color={trend > 0 ? 'success.main' : 'error.main'}
        >
          {Math.abs(trend).toFixed(1)}%
        </Typography>
      </Box>
    );
  };

  const navigateToMembers = (filter?: string) => {
    navigate('/members', { state: { filter } });
  };

  if (loading && !metrics.activeMembers) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading dashboard data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">
          Dashboard Overview
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {format(parseISO(lastUpdated), 'HH:mm:ss')}
            </Typography>
          )}
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={unreadNotifications ? `${unreadNotifications} new notifications` : 'No new notifications'}>
            <IconButton 
              color={unreadNotifications ? 'primary' : 'default'}
              onClick={() => dispatch(markNotificationsAsRead())}
            >
              <NotificationsIcon />
              {unreadNotifications > 0 && (
                <Chip
                  label={unreadNotifications}
                  color="error"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    height: 20,
                    minWidth: 20,
                  }}
                />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%',
              background: theme.palette.primary.light,
              color: theme.palette.primary.contrastText,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
              }
            }}
            onClick={() => navigateToMembers('active')}
          >
            <CardContent>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <PeopleIcon />
                  <Typography color="inherit" variant="subtitle1">
                    Active Members
                  </Typography>
                </Box>
                <Typography variant="h4">{metrics.activeMembers}</Typography>
                {renderTrendIndicator(metrics.activeMembers, metrics.previousActiveMembers)}
                <Typography variant="caption">
                  Retention Rate: {metrics.retentionRate.toFixed(1)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%',
              background: theme.palette.warning.light,
              color: theme.palette.warning.contrastText,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
              }
            }}
            onClick={() => navigateToMembers('inactive')}
          >
            <CardContent>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonOffIcon />
                  <Typography color="inherit" variant="subtitle1">
                    Inactive Members
                  </Typography>
                </Box>
                <Typography variant="h4">{metrics.inactiveMembers}</Typography>
                {renderTrendIndicator(metrics.inactiveMembers, metrics.previousInactiveMembers)}
                <Typography variant="caption">
                  Churn Rate: {metrics.churnRate.toFixed(1)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%',
              background: theme.palette.success.light,
              color: theme.palette.success.contrastText,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
              }
            }}
            onClick={() => navigateToMembers('renewal')}
          >
            <CardContent>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AutorenewIcon />
                  <Typography color="inherit" variant="subtitle1">
                    Renewals This Month
                  </Typography>
                </Box>
                <Typography variant="h4">{metrics.renewalsThisMonth}</Typography>
                {renderTrendIndicator(metrics.renewalsThisMonth, metrics.previousRenewals)}
                <Typography variant="caption">
                  Due for renewal
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%',
              background: theme.palette.info.light,
              color: theme.palette.info.contrastText,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
              }
            }}
            onClick={() => navigateToMembers()}
          >
            <CardContent>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <GroupsIcon />
                  <Typography color="inherit" variant="subtitle1">
                    Total Members
                  </Typography>
                </Box>
                <Typography variant="h4">{metrics.totalMembers}</Typography>
                {renderTrendIndicator(metrics.totalMembers, metrics.previousTotalMembers)}
                <Typography variant="caption">
                  View all members
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Date Range Selector */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, background: theme.palette.background.default }}>
            <Box display="flex" gap={2}>
              <TextField
                label="Start Date"
                type="date"
                value={format(parseISO(dateRange.startDate), 'yyyy-MM-dd')}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ background: theme.palette.background.paper }}
              />
              <TextField
                label="End Date"
                type="date"
                value={format(parseISO(dateRange.endDate), 'yyyy-MM-dd')}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ background: theme.palette.background.paper }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Membership Growth Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, background: theme.palette.background.default }}>
            <Typography variant="h6" gutterBottom>
              Membership Growth
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.membershipGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month"
                  tick={{ fill: theme.palette.text.primary }}
                />
                <YAxis 
                  tick={{ fill: theme.palette.text.primary }}
                />
                <RechartsTooltip 
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={{ fill: theme.palette.primary.main }}
                  name="New Members"
                />
                <Line
                  type="monotone"
                  dataKey="activeMembers"
                  stroke={theme.palette.success.main}
                  strokeWidth={2}
                  dot={{ fill: theme.palette.success.main }}
                  name="Active Members"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, background: theme.palette.background.default, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <List>
              {metrics.recentActivities.map((activity) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemIcon>
                      {activity.type === 'new_member' ? (
                        <PeopleIcon color="primary" />
                      ) : (
                        <AutorenewIcon color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.memberName}
                      secondary={
                        <>
                          <Typography variant="caption" display="block">
                            {format(parseISO(activity.date), 'PPp')}
                          </Typography>
                          {activity.details}
                        </>
                      }
                    />
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Upcoming Renewals Table */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, background: theme.palette.background.default }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Upcoming Renewals
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AutorenewIcon />}
                onClick={() => navigateToMembers('renewal')}
              >
                View All Renewals
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Subscription</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Days Left</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.upcomingRenewals.map((renewal) => {
                    const daysLeft = differenceInDays(
                      parseISO(renewal.endDate),
                      new Date()
                    );
                    return (
                      <TableRow 
                        key={renewal.id}
                        sx={{ 
                          '&:hover': { background: theme.palette.action.hover },
                          background: daysLeft <= 3 ? theme.palette.error.light : 'inherit',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigateToMembers('renewal')}
                      >
                        <TableCell>{renewal.name}</TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              color: theme.palette.primary.main,
                              fontWeight: 'medium',
                            }}
                          >
                            {renewal.subscriptionType}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(renewal.endDate), 'PP')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={renewal.paymentStatus.toUpperCase()}
                            color={
                              renewal.paymentStatus === 'paid'
                                ? 'success'
                                : renewal.paymentStatus === 'pending'
                                ? 'warning'
                                : 'error'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${daysLeft} days`}
                            color={
                              daysLeft <= 3
                                ? 'error'
                                : daysLeft <= 7
                                ? 'warning'
                                : 'success'
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 