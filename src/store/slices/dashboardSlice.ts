import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  Timestamp,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Member } from '../../types/member';
import { Payment } from '../../types/payment';
import { 
  parseISO, 
  addDays, 
  isAfter, 
  isBefore, 
  subMonths, 
  format,
  startOfMonth,
  endOfMonth,
  isSameMonth
} from 'date-fns';

// Enhanced interfaces for better metrics
interface RevenueMetrics {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  revenueGrowth: number;
  projectedRevenue: number;
  averageRevenuePerMember: number;
}

interface MembershipMetrics {
  activeMembers: number;
  inactiveMembers: number;
  renewalsThisMonth: number;
  totalMembers: number;
  previousActiveMembers: number;
  previousInactiveMembers: number;
  previousRenewals: number;
  previousTotalMembers: number;
  retentionRate: number;
  churnRate: number;
}

interface DashboardMetrics extends MembershipMetrics {
  revenue: RevenueMetrics;
  membershipGrowth: Array<{
    month: string;
    total: number;
    revenue: number;
    activeMembers: number;
  }>;
  upcomingRenewals: Array<{
    id: string;
    name: string;
    subscriptionType: string;
    endDate: string;
    paymentStatus: string;
    amount: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: 'new_member' | 'renewal' | 'payment' | 'cancellation';
    memberName: string;
    date: string;
    details: string;
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
  lastUpdated: string | null;
  unreadNotifications: number;
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
    retentionRate: 0,
    churnRate: 0,
    revenue: {
      currentMonthRevenue: 0,
      previousMonthRevenue: 0,
      revenueGrowth: 0,
      projectedRevenue: 0,
      averageRevenuePerMember: 0
    },
    membershipGrowth: [],
    upcomingRenewals: [],
    recentActivities: []
  },
  loading: false,
  error: null,
  dateRange: {
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
    endDate: new Date().toISOString(),
  },
  lastUpdated: null,
  unreadNotifications: 0
};

// Helper function to calculate subscription amount
const getSubscriptionAmount = (type: string): number => {
  const amounts: { [key: string]: number } = {
    monthly: 50,
    quarterly: 140,
    'semi-annual': 260,
    annual: 500
  };
  return amounts[type.toLowerCase()] || 0;
};

export const fetchDashboardMetrics = createAsyncThunk(
  'dashboard/fetchMetrics',
  async (dateRange: { startDate: string; endDate: string }) => {
    const membersRef = collection(db, 'members');
    const paymentsRef = collection(db, 'payments');
    
    // Get members data
    const membersSnapshot = await getDocs(membersRef);
    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Member[];

    // Get payments data
    const paymentsQuery = query(
      paymentsRef,
      where('date', '>=', startOfMonth(new Date())),
      orderBy('date', 'desc')
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const payments = paymentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Payment[];

    const currentDate = new Date();
    const previousDate = subMonths(currentDate, 1);

    // Calculate current metrics
    const activeMembers = members.filter(member => 
      new Date(member.subscriptionEndDate) >= currentDate
    );
    const inactiveMembers = members.filter(member => 
      new Date(member.subscriptionEndDate) < currentDate
    );

    // Calculate revenue metrics
    const currentMonthRevenue = payments
      .filter(payment => isSameMonth(payment.date.toDate(), currentDate))
      .reduce((sum, payment) => sum + payment.amount, 0);

    const previousMonthRevenue = payments
      .filter(payment => isSameMonth(payment.date.toDate(), previousDate))
      .reduce((sum, payment) => sum + payment.amount, 0);

    const revenueGrowth = previousMonthRevenue ? 
      ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

    // Calculate retention and churn rates
    const activeLastMonth = members.filter(member => {
      const endDate = new Date(member.subscriptionEndDate);
      return endDate >= previousDate && endDate < currentDate;
    }).length;

    const retentionRate = activeLastMonth ? 
      (activeMembers.length / activeLastMonth) * 100 : 100;
    const churnRate = 100 - retentionRate;

    // Calculate membership growth with revenue
    const membershipGrowth = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(currentDate, i);
      const monthKey = format(date, 'MMM yyyy');
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthlyMembers = members.filter(member => {
        const joinDate = new Date(member.joinDate);
        return joinDate >= monthStart && joinDate <= monthEnd;
      });

      const monthlyRevenue = payments
        .filter(payment => {
          const paymentDate = payment.date.toDate();
          return paymentDate >= monthStart && paymentDate <= monthEnd;
        })
        .reduce((sum, payment) => sum + payment.amount, 0);

      const activeInMonth = members.filter(member => {
        const endDate = new Date(member.subscriptionEndDate);
        return endDate >= monthEnd;
      }).length;

      return {
        month: monthKey,
        total: monthlyMembers.length,
        revenue: monthlyRevenue,
        activeMembers: activeInMonth
      };
    }).reverse();

    // Get upcoming renewals with payment info
    const upcomingRenewals = members
      .filter(member => {
        const endDate = parseISO(member.subscriptionEndDate);
        const thirtyDaysFromNow = addDays(currentDate, 30);
        return isAfter(endDate, currentDate) && isBefore(endDate, thirtyDaysFromNow);
      })
      .map(member => ({
        id: member.id || `temp-${Date.now()}`,
        name: `${member.firstName} ${member.lastName}`,
        subscriptionType: member.subscriptionType,
        endDate: member.subscriptionEndDate,
        paymentStatus: member.paymentStatus,
        amount: getSubscriptionAmount(member.subscriptionType)
      }))
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    // Get recent activities
    const recentActivities = [
      ...members
        .filter(member => {
          const joinDate = new Date(member.joinDate);
          return isAfter(joinDate, subMonths(currentDate, 1));
        })
        .map(member => ({
          id: `new-${member.id}`,
          type: 'new_member' as const,
          memberName: `${member.firstName} ${member.lastName}`,
          date: member.joinDate,
          details: `New member joined with ${member.subscriptionType} subscription`
        })),
      ...payments
        .filter(payment => isAfter(payment.date.toDate(), subMonths(currentDate, 1)))
        .map(payment => ({
          id: `payment-${payment.id}`,
          type: 'payment' as const,
          memberName: payment.memberName,
          date: payment.date.toDate().toISOString(),
          details: `Payment received: $${payment.amount}`
        }))
    ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

    return {
      activeMembers: activeMembers.length,
      inactiveMembers: inactiveMembers.length,
      renewalsThisMonth: upcomingRenewals.length,
      totalMembers: members.length,
      previousActiveMembers: activeLastMonth,
      previousInactiveMembers: members.length - activeLastMonth,
      previousRenewals: members.filter(member => {
        const endDate = new Date(member.subscriptionEndDate);
        return endDate.getMonth() === previousDate.getMonth() &&
               endDate.getFullYear() === previousDate.getFullYear();
      }).length,
      previousTotalMembers: members.filter(member => 
        new Date(member.joinDate) < previousDate
      ).length,
      retentionRate,
      churnRate,
      revenue: {
        currentMonthRevenue,
        previousMonthRevenue,
        revenueGrowth,
        projectedRevenue: currentMonthRevenue * 1.1, // Simple projection
        averageRevenuePerMember: activeMembers.length ? 
          currentMonthRevenue / activeMembers.length : 0
      },
      membershipGrowth,
      upcomingRenewals,
      recentActivities
    };
  }
);

// Action to setup real-time listeners
export const setupDashboardListeners = createAsyncThunk(
  'dashboard/setupListeners',
  async (_, { dispatch }) => {
    // Listen for member changes
    const membersRef = collection(db, 'members');
    const unsubscribeMembers = onSnapshot(membersRef, () => {
      dispatch(fetchDashboardMetrics({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        endDate: new Date().toISOString()
      }));
    });

    // Listen for payment changes
    const paymentsRef = collection(db, 'payments');
    const recentPaymentsQuery = query(
      paymentsRef,
      where('date', '>=', startOfMonth(new Date())),
      orderBy('date', 'desc'),
      limit(50)
    );
    const unsubscribePayments = onSnapshot(recentPaymentsQuery, () => {
      dispatch(fetchDashboardMetrics({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        endDate: new Date().toISOString()
      }));
    });

    return () => {
      unsubscribeMembers();
      unsubscribePayments();
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
    markNotificationsAsRead: (state) => {
      state.unreadNotifications = 0;
    },
    updateLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    }
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
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dashboard metrics';
      });
  },
});

export const { 
  setDateRange, 
  markNotificationsAsRead,
  updateLastUpdated 
} = dashboardSlice.actions;

export default dashboardSlice.reducer; 