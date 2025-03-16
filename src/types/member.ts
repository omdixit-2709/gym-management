export type SubscriptionType = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface Member {
  id: string;
  photoUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  joinDate: string;
  subscriptionType: SubscriptionType;
  subscriptionEndDate: string;
  paymentStatus: PaymentStatus;
}

export interface MemberFilters {
  subscriptionType: SubscriptionType | 'all';
  searchQuery: string;
  renewalMonth: number | null;
}

export interface ImportMemberData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subscriptionType: SubscriptionType;
  subscriptionStartDate?: string;
  subscriptionEndDate: string;
} 