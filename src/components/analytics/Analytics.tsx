import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Paper,
  Typography,
  useTheme,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import { RootState } from '../../store';
import { fetchAnalytics, setFilters } from '../../store/slices/analyticsSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Analytics: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { 
    retentionData, 
    subscriptionDistribution, 
    paymentAnalytics, 
    churnAnalytics,
    loading,
    error,
    filters 
  } = useSelector((state: RootState) => state.analytics);

  const [availableSubscriptionTypes] = useState(['Monthly', 'Quarterly', 'Annual', 'Premium']);
  const [availablePaymentStatuses] = useState(['Paid', 'Pending', 'Overdue', 'Cancelled']);

  useEffect(() => {
    dispatch(fetchAnalytics(filters));
  }, [dispatch, filters]);

  const handleDateRangeChange = (field: 'startDate' | 'endDate') => (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setFilters({
      dateRange: {
        ...filters.dateRange,
        [field]: event.target.value,
      },
    }));
  };

  const handleSubscriptionTypeChange = (event: any) => {
    dispatch(setFilters({
      subscriptionTypes: event.target.value,
    }));
  };

  const handlePaymentStatusChange = (event: any) => {
    dispatch(setFilters({
      paymentStatuses: event.target.value,
    }));
  };

  const refreshData = () => {
    dispatch(fetchAnalytics(filters));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">
          Advanced Analytics
        </Typography>
        <IconButton onClick={refreshData} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Filters Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Start Date"
              type="date"
              value={filters.dateRange.startDate.split('T')[0]}
              onChange={handleDateRangeChange('startDate')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="End Date"
              type="date"
              value={filters.dateRange.endDate.split('T')[0]}
              onChange={handleDateRangeChange('endDate')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Subscription Types</InputLabel>
              <Select
                multiple
                value={filters.subscriptionTypes}
                onChange={handleSubscriptionTypeChange}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Stack>
                )}
              >
                {availableSubscriptionTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select
                multiple
                value={filters.paymentStatuses}
                onChange={handlePaymentStatusChange}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Stack>
                )}
              >
                {availablePaymentStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Member Retention */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', background: alpha(theme.palette.background.paper, 0.8) }}>
            <Typography variant="h6" gutterBottom>
              Member Retention Rates
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                <XAxis 
                  dataKey="period" 
                  stroke={theme.palette.text.primary}
                />
                <YAxis 
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                  stroke={theme.palette.text.primary}
                />
                <RechartsTooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Retention Rate']}
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="rate" 
                  fill={theme.palette.primary.main}
                  name="Retention Rate"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Subscription Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', background: alpha(theme.palette.background.paper, 0.8) }}>
            <Typography variant="h6" gutterBottom>
              Subscription Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subscriptionDistribution}
                  dataKey="percentage"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  label={({ name, percent }) => 
                    `${name} ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {subscriptionDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Payment Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', background: alpha(theme.palette.background.paper, 0.8) }}>
            <Typography variant="h6" gutterBottom>
              Payment Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentAnalytics}
                  dataKey="percentage"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  label={({ name, percent }) => 
                    `${name} ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {paymentAnalytics.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Churn Analysis */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', background: alpha(theme.palette.background.paper, 0.8) }}>
            <Typography variant="h6" gutterBottom>
              Monthly Churn Analysis
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={churnAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                <XAxis 
                  dataKey="month" 
                  stroke={theme.palette.text.primary}
                />
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  tickFormatter={(value) => `${value}%`}
                  stroke={theme.palette.error.main}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => value}
                  stroke={theme.palette.success.main}
                />
                <RechartsTooltip 
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="rate"
                  stroke={theme.palette.error.main}
                  fill={alpha(theme.palette.error.main, 0.1)}
                  name="Churn Rate"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="retained"
                  stroke={theme.palette.success.main}
                  fill={alpha(theme.palette.success.main, 0.1)}
                  name="Retained Members"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics; 