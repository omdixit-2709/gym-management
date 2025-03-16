export type InterestLevel = 'high' | 'medium' | 'low';
export type WalkInStatus = 'pending' | 'converted' | 'not_interested';

export interface WalkIn {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  visitDate: string;
  interestLevel: InterestLevel;
  followUpDate: string;
  followUpTime: string;
  status: WalkInStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalkInFilters {
  dateRange: {
    start: string | null;
    end: string | null;
  };
  status: WalkInStatus | 'all';
  searchQuery: string;
} 