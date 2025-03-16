import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Member, MemberFilters, ImportMemberData } from '../../types/member';

interface MemberState {
  members: Member[];
  loading: boolean;
  error: string | null;
  filters: MemberFilters;
}

const initialState: MemberState = {
  members: [],
  loading: false,
  error: null,
  filters: {
    subscriptionType: 'all',
    searchQuery: '',
    renewalMonth: null,
  },
};

// Async thunks
export const fetchMembers = createAsyncThunk(
  'members/fetchMembers',
  async () => {
    const querySnapshot = await getDocs(collection(db, 'members'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Member[];
  }
);

export const importMembers = createAsyncThunk(
  'members/importMembers',
  async (members: ImportMemberData[]) => {
    const membersRef = collection(db, 'members');
    const importedMembers: Member[] = [];

    for (const member of members) {
      const newMember: Omit<Member, 'id'> = {
        ...member,
        photoUrl: '', // Default empty photo URL
        joinDate: member.subscriptionStartDate || new Date().toISOString(), // Use start date as join date if available
        paymentStatus: 'paid',
      };

      const docRef = await addDoc(membersRef, newMember);
      importedMembers.push({ ...newMember, id: docRef.id });
    }

    return importedMembers;
  }
);

export const updateMember = createAsyncThunk(
  'members/updateMember',
  async ({ id, data }: { id: string; data: Partial<Member> }) => {
    const memberRef = doc(db, 'members', id);
    await updateDoc(memberRef, data);
    return { id, ...data };
  }
);

const memberSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<MemberFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.members = action.payload;
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch members';
      })
      .addCase(importMembers.fulfilled, (state, action) => {
        state.members = [...state.members, ...action.payload];
      })
      .addCase(updateMember.fulfilled, (state, action) => {
        const index = state.members.findIndex(member => member.id === action.payload.id);
        if (index !== -1) {
          state.members[index] = { ...state.members[index], ...action.payload };
        }
      });
  },
});

export const { setFilters, clearFilters } = memberSlice.actions;
export default memberSlice.reducer; 