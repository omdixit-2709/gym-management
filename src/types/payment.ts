import { Timestamp } from 'firebase/firestore';

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: Timestamp;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  status: PaymentStatus;
  subscriptionType: string;
  subscriptionPeriod: {
    start: string;
    end: string;
  };
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentFilters {
  startDate: string | null;
  endDate: string | null;
  paymentStatus: PaymentStatus | 'all';
  paymentMethod: string | 'all';
  searchQuery: string;
} 