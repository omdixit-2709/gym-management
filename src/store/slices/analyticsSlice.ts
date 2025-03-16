import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Member } from '../../types/member';

interface FilterOptions {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  subscriptionTypes: string[];
  paymentStatuses: string[];
}

interface RetentionData {
  period: string;
  rate: number;
  count: number;
}

interface SubscriptionDistribution {
  type: string;
  count: number;
  percentage: number;
}

interface PaymentAnalytics {
  status: string;
  count: number;
  percentage: number;
}

interface ChurnAnalytics {
  month: string;
  churned: number;
  retained: number;
  rate: number;
}

interface AnalyticsState {
  retentionData: RetentionData[];
  subscriptionDistribution: SubscriptionDistribution[];
  paymentAnalytics: PaymentAnalytics[];
  churnAnalytics: ChurnAnalytics[];
  loading: boolean;
  error: string | null;
  filters: FilterOptions;
}

const initialState: AnalyticsState = {
  retentionData: [],
  subscriptionDistribution: [],
  paymentAnalytics: [],
  churnAnalytics: [],
  loading: false,
  error: null,
  filters: {
    dateRange: {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString(),
      endDate: new Date().toISOString(),
    },
    subscriptionTypes: [],
    paymentStatuses: [],
  },
};

export const fetchAnalytics = createAsyncThunk(
  'analytics/fetchData',
  async (filters: FilterOptions) => {
    const membersRef = collection(db, 'members');
    const membersSnapshot = await getDocs(membersRef);
    let members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Member[];

    // Apply filters
    const startDate = new Date(filters.dateRange.startDate);
    const endDate = new Date(filters.dateRange.endDate);

    members = members.filter(member => {
      const joinDate = new Date(member.joinDate);
      const isInDateRange = joinDate >= startDate && joinDate <= endDate;
      const matchesSubscriptionType = filters.subscriptionTypes.length === 0 || 
        filters.subscriptionTypes.includes(member.subscriptionType);
      const matchesPaymentStatus = filters.paymentStatuses.length === 0 || 
        filters.paymentStatuses.includes(member.paymentStatus);
      
      return isInDateRange && matchesSubscriptionType && matchesPaymentStatus;
    });

    // Calculate Retention Data (3, 6, 12 months)
    const currentDate = new Date();
    const retentionPeriods = [3, 6, 12];
    const retentionData = retentionPeriods.map(months => {
      const periodDate = new Date();
      periodDate.setMonth(currentDate.getMonth() - months);
      
      const totalInPeriod = members.filter(member => 
        new Date(member.joinDate) <= periodDate
      ).length;

      const retained = members.filter(member =>
        new Date(member.joinDate) <= periodDate &&
        new Date(member.subscriptionEndDate) >= currentDate
      ).length;

      return {
        period: `${months} Month${months > 1 ? 's' : ''}`,
        rate: totalInPeriod > 0 ? (retained / totalInPeriod) * 100 : 0,
        count: retained
      };
    });

    // Calculate Subscription Distribution
    const subscriptionCounts = members.reduce((acc, member) => {
      acc[member.subscriptionType] = (acc[member.subscriptionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const subscriptionDistribution = Object.entries(subscriptionCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / (members.length || 1)) * 100
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate Payment Analytics
    const paymentCounts = members.reduce((acc, member) => {
      acc[member.paymentStatus] = (acc[member.paymentStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const paymentAnalytics = Object.entries(paymentCounts)
      .map(([status, count]) => ({
        status,
        count,
        percentage: (count / (members.length || 1)) * 100
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate Churn Analytics (last 6 months)
    const churnAnalytics = Array.from({ length: 6 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const activeStart = members.filter(member =>
        new Date(member.subscriptionEndDate) >= monthStart
      ).length;

      const churned = members.filter(member => {
        const endDate = new Date(member.subscriptionEndDate);
        return endDate >= monthStart && endDate <= monthEnd;
      }).length;

      return {
        month: month.toLocaleString('default', { month: 'short' }),
        churned,
        retained: activeStart - churned,
        rate: activeStart > 0 ? (churned / activeStart) * 100 : 0
      };
    }).reverse();

    return {
      retentionData,
      subscriptionDistribution,
      paymentAnalytics,
      churnAnalytics
    };
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.retentionData = action.payload.retentionData;
        state.subscriptionDistribution = action.payload.subscriptionDistribution;
        state.paymentAnalytics = action.payload.paymentAnalytics;
        state.churnAnalytics = action.payload.churnAnalytics;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch analytics data';
      });
  },
});

export const { setFilters } = analyticsSlice.actions;
export default analyticsSlice.reducer; 