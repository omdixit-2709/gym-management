import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
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
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import GroupsIcon from '@mui/icons-material/Groups';
import { RootState } from '../../store';
import { fetchDashboardMetrics, setDateRange } from '../../store/slices/dashboardSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { metrics, loading, error, dateRange } = useSelector(
    (state: RootState) => state.dashboard
  );

  useEffect(() => {
    dispatch(fetchDashboardMetrics(dateRange));
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

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Dashboard Overview
      </Typography>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: theme.palette.primary.light,
            color: theme.palette.primary.contrastText,
          }}>
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: theme.palette.warning.light,
            color: theme.palette.warning.contrastText,
          }}>
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: theme.palette.success.light,
            color: theme.palette.success.contrastText,
          }}>
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: theme.palette.info.light,
            color: theme.palette.info.contrastText,
          }}>
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
                value={format(new Date(dateRange.startDate), 'yyyy-MM-dd')}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ background: theme.palette.background.paper }}
              />
              <TextField
                label="End Date"
                type="date"
                value={format(new Date(dateRange.endDate), 'yyyy-MM-dd')}
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
                <Tooltip 
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={{ fill: theme.palette.primary.main }}
                  name="New Members"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Upcoming Renewals Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, background: theme.palette.background.default }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Renewals
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Subscription Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.upcomingRenewals.map((renewal) => (
                    <TableRow 
                      key={renewal.id}
                      sx={{ '&:hover': { background: theme.palette.action.hover } }}
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
                        {format(new Date(renewal.endDate), 'dd/MM/yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
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