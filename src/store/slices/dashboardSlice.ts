import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Member } from '../../types/member';
import { parseISO, addDays, isAfter, isBefore, subMonths, format } from 'date-fns';

interface DashboardMetrics {
  activeMembers: number;
  inactiveMembers: number;
  renewalsThisMonth: number;
  totalMembers: number;
  previousActiveMembers: number;
  previousInactiveMembers: number;
  previousRenewals: number;
  previousTotalMembers: number;
  membershipGrowth: Array<{
    month: string;
    total: number;
  }>;
  upcomingRenewals: Array<{
    id: string;
    name: string;
    subscriptionType: string;
    endDate: string;
  }>;
}

interface DashboardState {
  metrics: DashboardMetrics;
  loading: boolean;
  error: string | null;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const initialState: DashboardState = {
  metrics: {
    activeMembers: 0,
    inactiveMembers: 0,
    renewalsThisMonth: 0,
    totalMembers: 0,
    previousActiveMembers: 0,
    previousInactiveMembers: 0,
    previousRenewals: 0,
    previousTotalMembers: 0,
    membershipGrowth: [],
    upcomingRenewals: [],
  },
  loading: false,
  error: null,
  dateRange: {
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
    endDate: new Date().toISOString(),
  },
};

export const fetchDashboardMetrics = createAsyncThunk(
  'dashboard/fetchMetrics',
  async (dateRange: { startDate: string; endDate: string }) => {
    const membersRef = collection(db, 'members');
    const membersSnapshot = await getDocs(membersRef);
    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Member[];

    const currentDate = new Date();
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);

    // Calculate current metrics
    const activeMembers = members.filter(member => 
      new Date(member.subscriptionEndDate) >= currentDate
    ).length;

    const inactiveMembers = members.length - activeMembers;

    const renewalsThisMonth = members.filter(member => {
      const endDate = new Date(member.subscriptionEndDate);
      return endDate.getMonth() === currentDate.getMonth() &&
             endDate.getFullYear() === currentDate.getFullYear();
    }).length;

    // Calculate previous month metrics
    const previousActiveMembers = members.filter(member => {
      const endDate = new Date(member.subscriptionEndDate);
      return endDate >= previousDate && endDate < currentDate;
    }).length;

    const previousInactiveMembers = members.filter(member => {
      const endDate = new Date(member.subscriptionEndDate);
      return endDate < previousDate;
    }).length;

    const previousRenewals = members.filter(member => {
      const endDate = new Date(member.subscriptionEndDate);
      return endDate.getMonth() === previousDate.getMonth() &&
             endDate.getFullYear() === previousDate.getFullYear();
    }).length;

    // Calculate membership growth over past 12 months
    const membershipGrowth = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'MMM yyyy');
      const count = members.filter(member => {
        const joinDate = new Date(member.joinDate);
        return joinDate.getMonth() === date.getMonth() &&
               joinDate.getFullYear() === date.getFullYear();
      }).length;
      return {
        month: monthKey,
        total: count
      };
    }).reverse();

    // Get upcoming renewals
    const upcomingRenewals = members
      .filter(member => {
        const endDate = parseISO(member.subscriptionEndDate);
        const thirtyDaysFromNow = addDays(new Date(), 30);
        return isAfter(endDate, new Date()) && isBefore(endDate, thirtyDaysFromNow);
      })
      .map(member => ({
        id: member.id || `temp-${Date.now()}`,
        name: `${member.firstName} ${member.lastName}`,
        subscriptionType: member.subscriptionType,
        endDate: member.subscriptionEndDate
      }));

    return {
      activeMembers,
      inactiveMembers,
      renewalsThisMonth,
      totalMembers: members.length,
      previousActiveMembers,
      previousInactiveMembers,
      previousRenewals,
      previousTotalMembers: members.filter(member => 
        new Date(member.joinDate) < previousDate
      ).length,
      membershipGrowth,
      upcomingRenewals,
    };
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.metrics = action.payload;
      })
      .addCase(fetchDashboardMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dashboard metrics';
      });
  },
});

export const { setDateRange } = dashboardSlice.actions;
export default dashboardSlice.reducer; 