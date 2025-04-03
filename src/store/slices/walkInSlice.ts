import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { WalkIn, WalkInFilters } from '../../types/walkIn';

interface WalkInState {
  walkIns: WalkIn[];
  loading: boolean;
  error: string | null;
  filters: WalkInFilters;
}

const initialState: WalkInState = {
  walkIns: [],
  loading: false,
  error: null,
  filters: {
    dateRange: {
      start: null,
      end: null,
    },
    status: 'all',
    searchQuery: '',
  },
};

// Async thunks
export const fetchWalkIns = createAsyncThunk(
  'walkIns/fetchWalkIns',
  async () => {
    const q = query(collection(db, 'walkIns'), orderBy('visitDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as WalkIn[];
  }
);

export const addWalkIn = createAsyncThunk(
  'walkIns/addWalkIn',
  async (walkInData: Omit<WalkIn, 'id'>) => {
    const docRef = await addDoc(collection(db, 'walkIns'), walkInData);
    return {
      id: docRef.id,
      ...walkInData,
    } as WalkIn;
  }
);

export const updateWalkIn = createAsyncThunk(
  'walkIns/updateWalkIn',
  async ({ id, data }: { id: string; data: Partial<WalkIn> }) => {
    const docRef = doc(db, 'walkIns', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { id, ...data };
  }
);

export const deleteWalkIn = createAsyncThunk(
  'walkIns/deleteWalkIn',
  async (id: string) => {
    const docRef = doc(db, 'walkIns', id);
    await deleteDoc(docRef);
    return id;
  }
);

export const deleteMultipleWalkIns = createAsyncThunk(
  'walkIns/deleteMultipleWalkIns',
  async (ids: string[]) => {
    await Promise.all(ids.map(id => {
      const docRef = doc(db, 'walkIns', id);
      return deleteDoc(docRef);
    }));
    return ids;
  }
);

const walkInSlice = createSlice({
  name: 'walkIns',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalkIns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalkIns.fulfilled, (state, action) => {
        state.walkIns = action.payload;
        state.loading = false;
      })
      .addCase(fetchWalkIns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch walk-ins';
      })
      .addCase(addWalkIn.fulfilled, (state, action) => {
        state.walkIns.unshift(action.payload);
      })
      .addCase(updateWalkIn.fulfilled, (state, action) => {
        const index = state.walkIns.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.walkIns[index] = {
            ...state.walkIns[index],
            ...action.payload,
          };
        }
      })
      .addCase(deleteWalkIn.fulfilled, (state, action) => {
        state.walkIns = state.walkIns.filter(w => w.id && w.id !== action.payload);
      })
      .addCase(deleteMultipleWalkIns.fulfilled, (state, action) => {
        state.walkIns = state.walkIns.filter(w => w.id && !action.payload.includes(w.id));
      });
  },
});

export const { setFilters, clearFilters } = walkInSlice.actions;
export default walkInSlice.reducer; 