import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  collection, 
  query, 
  getDocs,
  where,
  Timestamp,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Member } from '../../types/member';
import { WalkIn, WalkInStatus, InterestLevel } from '../../types/walkIn';
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  format, 
  parseISO, 
  isSameMonth,
  differenceInDays
} from 'date-fns';

interface FilterOptions {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  subscriptionTypes: string[];
  paymentStatuses: string[];
  interestLevels: InterestLevel[];
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

interface WalkInAnalytics {
  month: string;
  total: number;
  converted: number;
  conversionRate: number;
  notInterested: number;
  pending: number;
}

interface WalkInInterestAnalytics {
  level: InterestLevel;
  count: number;
  convertedCount: number;
  conversionRate: number;
}

interface ConversionFunnel {
  stage: string;
  count: number;
  percentage: number;
}

interface RetentionFactors {
  factor: string;
  impact: number;
}

interface AnalyticsState {
  retentionData: RetentionData[];
  subscriptionDistribution: SubscriptionDistribution[];
  paymentAnalytics: PaymentAnalytics[];
  churnAnalytics: ChurnAnalytics[];
  walkInAnalytics: WalkInAnalytics[];
  walkInInterestAnalytics: WalkInInterestAnalytics[];
  conversionFunnel: ConversionFunnel[];
  retentionFactors: RetentionFactors[];
  totalWalkIns: number;
  conversionRate: number;
  memberRetentionRate: number;
  loading: boolean;
  error: string | null;
  filters: FilterOptions;
  lastUpdated: string | null;
}

const initialState: AnalyticsState = {
  retentionData: [],
  subscriptionDistribution: [],
  paymentAnalytics: [],
  churnAnalytics: [],
  walkInAnalytics: [],
  walkInInterestAnalytics: [],
  conversionFunnel: [],
  retentionFactors: [],
  totalWalkIns: 0,
  conversionRate: 0,
  memberRetentionRate: 0,
  loading: false,
  error: null,
  filters: {
    dateRange: {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString(),
      endDate: new Date().toISOString(),
    },
    subscriptionTypes: [],
    paymentStatuses: [],
    interestLevels: [],
  },
  lastUpdated: null,
};

export const fetchAnalytics = createAsyncThunk(
  'analytics/fetchData',
  async (filters: FilterOptions) => {
    // Fetch members data
    const membersRef = collection(db, 'members');
    const membersSnapshot = await getDocs(membersRef);
    let members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Member[];

    // Fetch walk-ins data
    const walkInsRef = collection(db, 'walkIns');
    const walkInsSnapshot = await getDocs(walkInsRef);
    let walkIns = walkInsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as WalkIn[];

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

    walkIns = walkIns.filter(walkIn => {
      const visitDate = new Date(walkIn.visitDate);
      const isInDateRange = visitDate >= startDate && visitDate <= endDate;
      const matchesInterestLevel = filters.interestLevels.length === 0 || 
        filters.interestLevels.includes(walkIn.interestLevel);
      
      return isInDateRange && matchesInterestLevel;
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

    // Calculate overall retention rate
    const totalMembers = members.length;
    const activeMembers = members.filter(member => 
      new Date(member.subscriptionEndDate) >= currentDate
    ).length;
    const memberRetentionRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

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

    // Calculate Walk-In to Member Conversion Rate
    const totalWalkIns = walkIns.length;
    const convertedWalkIns = walkIns.filter(walkIn => walkIn.status === 'converted').length;
    const conversionRate = totalWalkIns > 0 ? (convertedWalkIns / totalWalkIns) * 100 : 0;

    // Calculate Monthly Walk-In Analytics
    const walkInAnalytics = Array.from({ length: 6 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthName = month.toLocaleString('default', { month: 'short' });
      
      const monthWalkIns = walkIns.filter(walkIn => {
        const visitDate = new Date(walkIn.visitDate);
        return visitDate.getMonth() === month.getMonth() && 
               visitDate.getFullYear() === month.getFullYear();
      });
      
      const monthTotal = monthWalkIns.length;
      const monthConverted = monthWalkIns.filter(walkIn => walkIn.status === 'converted').length;
      const monthNotInterested = monthWalkIns.filter(walkIn => walkIn.status === 'not_interested').length;
      const monthPending = monthWalkIns.filter(walkIn => walkIn.status === 'pending').length;
      
      return {
        month: monthName,
        total: monthTotal,
        converted: monthConverted,
        conversionRate: monthTotal > 0 ? (monthConverted / monthTotal) * 100 : 0,
        notInterested: monthNotInterested,
        pending: monthPending
      };
    }).reverse();

    // Calculate Walk-In Interest Level Analytics
    const interestLevels: InterestLevel[] = ['high', 'medium', 'low'];
    const walkInInterestAnalytics = interestLevels.map(level => {
      const walkInsWithLevel = walkIns.filter(walkIn => walkIn.interestLevel === level);
      const count = walkInsWithLevel.length;
      const convertedCount = walkInsWithLevel.filter(walkIn => walkIn.status === 'converted').length;
      
      return {
        level,
        count,
        convertedCount,
        conversionRate: count > 0 ? (convertedCount / count) * 100 : 0
      };
    }).sort((a, b) => b.count - a.count);

    // Calculate Conversion Funnel
    const conversionFunnel = [
      {
        stage: 'Walk-Ins',
        count: totalWalkIns,
        percentage: 100
      },
      {
        stage: 'Interested (Follow-Up)',
        count: walkIns.filter(walkIn => walkIn.status !== 'not_interested').length,
        percentage: totalWalkIns > 0 ? 
          (walkIns.filter(walkIn => walkIn.status !== 'not_interested').length / totalWalkIns) * 100 : 0
      },
      {
        stage: 'High Interest',
        count: walkIns.filter(walkIn => walkIn.interestLevel === 'high').length,
        percentage: totalWalkIns > 0 ? 
          (walkIns.filter(walkIn => walkIn.interestLevel === 'high').length / totalWalkIns) * 100 : 0
      },
      {
        stage: 'Converted to Member',
        count: convertedWalkIns,
        percentage: totalWalkIns > 0 ? (convertedWalkIns / totalWalkIns) * 100 : 0
      }
    ];

    // Calculate Retention Factors (simplified simulation for demo)
    const retentionFactors = [
      { factor: 'Subscription Duration', impact: 85 },
      { factor: 'Price Point', impact: 72 },
      { factor: 'Facility Quality', impact: 65 },
      { factor: 'Staff Interaction', impact: 58 },
      { factor: 'Location Convenience', impact: 45 }
    ];

    return {
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
      lastUpdated: new Date().toISOString()
    };
  }
);

export const setupAnalyticsListeners = createAsyncThunk(
  'analytics/setupListeners',
  async (_, { dispatch }) => {
    // Listen for member changes
    const membersRef = collection(db, 'members');
    const unsubscribeMembers = onSnapshot(membersRef, () => {
      dispatch(fetchAnalytics(initialState.filters));
    });

    // Listen for walkIn changes
    const walkInsRef = collection(db, 'walkIns');
    const unsubscribeWalkIns = onSnapshot(walkInsRef, () => {
      dispatch(fetchAnalytics(initialState.filters));
    });

    return () => {
      unsubscribeMembers();
      unsubscribeWalkIns();
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
    updateLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    }
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
        state.walkInAnalytics = action.payload.walkInAnalytics;
        state.walkInInterestAnalytics = action.payload.walkInInterestAnalytics;
        state.conversionFunnel = action.payload.conversionFunnel;
        state.retentionFactors = action.payload.retentionFactors;
        state.totalWalkIns = action.payload.totalWalkIns;
        state.conversionRate = action.payload.conversionRate;
        state.memberRetentionRate = action.payload.memberRetentionRate;
        state.lastUpdated = action.payload.lastUpdated;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch analytics data';
      });
  },
});

export const { setFilters, updateLastUpdated } = analyticsSlice.actions;
export default analyticsSlice.reducer; 