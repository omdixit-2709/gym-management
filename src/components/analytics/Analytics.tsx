import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  Card,
  CardContent,
  Button,
  LinearProgress,
  Divider,
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
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { format, parseISO } from 'date-fns';
import { RootState } from '../../store';
import { 
  fetchAnalytics,
  setFilters, 
  setupAnalyticsListeners, 
  updateLastUpdated 
} from '../../store/slices/analyticsSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { InterestLevel } from '../../types/walkIn';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Analytics: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { 
    retentionData, 
    subscriptionDistribution, 
    paymentAnalytics, 
    churnAnalytics,
    walkInAnalytics,
    walkInInterestAnalytics,
    conversionFunnel,
    retentionFactors,
    totalWalkIns,
    conversionRate,
    memberRetentionRate,
    lastUpdated,
    loading,
    error,
    filters 
  } = useSelector((state: RootState) => state.analytics);

  const [availableSubscriptionTypes] = useState(['Monthly', 'Quarterly', 'Annual', 'Premium']);
  const [availablePaymentStatuses] = useState(['Paid', 'Pending', 'Overdue', 'Cancelled']);
  const [availableInterestLevels] = useState<InterestLevel[]>(['high', 'medium', 'low']);

  useEffect(() => {
    dispatch(fetchAnalytics(filters));
    let cleanup: (() => void) | undefined;
    
    const setupListeners = async () => {
      try {
        const result = await dispatch(setupAnalyticsListeners()).unwrap();
        if (typeof result === 'function') {
          cleanup = result;
        }
      } catch (error) {
        console.error('Failed to setup analytics listeners:', error);
      }
    };

    setupListeners();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
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

  const handleInterestLevelChange = (event: any) => {
    dispatch(setFilters({
      interestLevels: event.target.value,
    }));
  };

  const refreshData = () => {
    dispatch(fetchAnalytics(filters));
    dispatch(updateLastUpdated());
  };

  const navigateToMembers = () => {
    navigate('/members');
  };

  const navigateToWalkIns = () => {
    navigate('/walk-ins');
  };

  const renderTrendIndicator = (current: number, target: number) => {
    const difference = current - target;
    const percentageDifference = target !== 0 ? (difference / target) * 100 : 100;
    
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        {percentageDifference >= 0 ? (
          <TrendingUpIcon sx={{ color: theme.palette.success.main }} />
        ) : (
          <TrendingDownIcon sx={{ color: theme.palette.error.main }} />
        )}
        <Typography
          variant="body2"
          color={percentageDifference >= 0 ? 'success.main' : 'error.main'}
        >
          {Math.abs(percentageDifference).toFixed(1)}%
        </Typography>
      </Box>
    );
  };

  if (loading && !retentionData.length) {
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
        <Stack direction="row" spacing={2} alignItems="center">
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {format(parseISO(lastUpdated), 'HH:mm:ss')}
            </Typography>
          )}
          <Tooltip title="Refresh data">
            <IconButton onClick={refreshData} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%', 
            background: alpha(theme.palette.primary.main, 0.1),
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.02)' }
          }}
          onClick={navigateToMembers}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Member Retention Rate
                  </Typography>
                  <Typography variant="h4" component="div">
                    {memberRetentionRate.toFixed(1)}%
                  </Typography>
                  {renderTrendIndicator(memberRetentionRate, 75)} {/* Target 75% retention */}
                </Box>
                <PeopleIcon sx={{ fontSize: 48, color: theme.palette.primary.main, opacity: 0.8 }} />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(memberRetentionRate, 100)} 
                sx={{ mt: 2, height: 8, borderRadius: 4 }} 
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: alpha(theme.palette.success.main, 0.1),
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.02)' }
          }}
          onClick={navigateToWalkIns}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Walk-In Conversion Rate
                  </Typography>
                  <Typography variant="h4" component="div">
                    {conversionRate.toFixed(1)}%
                  </Typography>
                  {renderTrendIndicator(conversionRate, 25)} {/* Target 25% conversion */}
                </Box>
                <PersonAddIcon sx={{ fontSize: 48, color: theme.palette.success.main, opacity: 0.8 }} />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(conversionRate, 100)} 
                sx={{ mt: 2, height: 8, borderRadius: 4, backgroundColor: alpha(theme.palette.success.main, 0.2), 
                '& .MuiLinearProgress-bar': { backgroundColor: theme.palette.success.main } }} 
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: alpha(theme.palette.info.main, 0.1),
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.02)' }
          }}
          onClick={navigateToWalkIns}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Walk-Ins
                  </Typography>
                  <Typography variant="h4" component="div">
                    {totalWalkIns}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This period
                  </Typography>
                </Box>
                <EqualizerIcon sx={{ fontSize: 48, color: theme.palette.info.main, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: alpha(theme.palette.warning.main, 0.1),
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.02)' }
          }}
          onClick={navigateToMembers}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Churn Rate (Monthly)
                  </Typography>
                  <Typography variant="h4" component="div">
                    {churnAnalytics.length > 0 ? churnAnalytics[churnAnalytics.length - 1].rate.toFixed(1) : 0}%
                  </Typography>
                  {churnAnalytics.length > 1 && renderTrendIndicator(
                    churnAnalytics[churnAnalytics.length - 2].rate,
                    churnAnalytics[churnAnalytics.length - 1].rate
                  )}
                </Box>
                <AccessTimeIcon sx={{ fontSize: 48, color: theme.palette.warning.main, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Start Date"
              type="date"
              value={filters.dateRange.startDate.split('T')[0]}
              onChange={handleDateRangeChange('startDate')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="End Date"
              type="date"
              value={filters.dateRange.endDate.split('T')[0]}
              onChange={handleDateRangeChange('endDate')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Interest Levels</InputLabel>
              <Select
                multiple
                value={filters.interestLevels}
                onChange={handleInterestLevelChange}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(selected as InterestLevel[]).map((value) => (
                      <Chip 
                        key={value} 
                        label={value.charAt(0).toUpperCase() + value.slice(1)} 
                        size="small"
                        color={value === 'high' ? 'success' : value === 'medium' ? 'warning' : 'error'}
                      />
                    ))}
                  </Stack>
                )}
              >
                {availableInterestLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* First Row: Conversion and Retention Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* WalkIn to Member Conversion */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', background: alpha(theme.palette.background.paper, 0.8) }}>
            <Typography variant="h6" gutterBottom>
              Walk-In to Member Conversion
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={navigateToWalkIns}
                sx={{ mr: 1 }}
              >
                Manage Walk-Ins
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={navigateToMembers}
              >
                View Members
              </Button>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={walkInAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                <XAxis 
                  dataKey="month" 
                  stroke={theme.palette.text.primary}
                />
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  stroke={theme.palette.primary.main}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `${value}%`}
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
                  dataKey="total"
                  stroke={theme.palette.primary.main}
                  fill={alpha(theme.palette.primary.main, 0.1)}
                  name="Total Walk-Ins"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="converted"
                  stroke={theme.palette.success.main}
                  fill={alpha(theme.palette.success.main, 0.1)}
                  name="Converted to Members"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversionRate"
                  stroke={theme.palette.warning.main}
                  strokeWidth={2}
                  name="Conversion Rate %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

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
      </Grid>

      {/* Second Row: Interest Level Analytics and Conversion Funnel */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Interest Level Analytics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', background: alpha(theme.palette.background.paper, 0.8) }}>
            <Typography variant="h6" gutterBottom>
              Walk-In Interest Level Analytics
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={walkInInterestAnalytics} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                <XAxis type="number" stroke={theme.palette.text.primary} />
                <YAxis 
                  dataKey="level" 
                  type="category" 
                  stroke={theme.palette.text.primary}
                  tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                />
                <RechartsTooltip 
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="count" 
                  fill={theme.palette.primary.main}
                  name="Total Walk-Ins"
                  radius={[0, 4, 4, 0]}
                />
                <Bar 
                  dataKey="convertedCount" 
                  fill={theme.palette.success.main}
                  name="Converted to Members"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Conversion Funnel */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', background: alpha(theme.palette.background.paper, 0.8) }}>
            <Typography variant="h6" gutterBottom>
              Member Conversion Funnel
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart>
                <RechartsTooltip
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <Box sx={{ 
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        p: 1
                      }}>
                        <Typography variant="body2">
                          {data.stage}: {data.count} ({data.percentage.toFixed(1)}%)
                        </Typography>
                      </Box>
                    );
                  }}
                />
                <Funnel
                  dataKey="count"
                  data={conversionFunnel}
                  nameKey="stage"
                >
                  <LabelList 
                    position="right" 
                    fill={theme.palette.text.primary} 
                    stroke="none" 
                    dataKey="stage" 
                  />
                  <LabelList 
                    position="left" 
                    fill={theme.palette.text.primary} 
                    stroke="none" 
                    dataKey={(entry: any) => 
                      `${entry.count} (${entry.percentage.toFixed(1)}%)`
                    } 
                  />
                  {conversionFunnel.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Third Row: Distribution and Churn Analysis */}
      <Grid container spacing={3}>
        {/* Subscription Distribution */}
        <Grid item xs={12} md={4}>
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
        <Grid item xs={12} md={4}>
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

        {/* Retention Factors */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%', background: alpha(theme.palette.background.paper, 0.8) }}>
            <Typography variant="h6" gutterBottom>
              Retention Impact Factors
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                layout="vertical" 
                data={retentionFactors}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  type="category" 
                  dataKey="factor" 
                />
                <RechartsTooltip
                  formatter={(value: number) => [`${value}%`, 'Impact']}
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Bar 
                  dataKey="impact" 
                  fill={theme.palette.info.main}
                  name="Impact Factor"
                >
                  {retentionFactors.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={alpha(theme.palette.info.main, 1 - (index * 0.15))} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Churn Analysis */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, background: alpha(theme.palette.background.paper, 0.8) }}>
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