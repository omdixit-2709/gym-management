import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { AttendanceSettings } from '../../types/staff';

interface SettingsState {
  data: {
    attendance: AttendanceSettings;
  };
  loading: boolean;
  error: string | null;
}

const DEFAULT_SETTINGS: SettingsState['data'] = {
  attendance: {
    morningSlot: {
      start: '09:00',
      end: '13:00',
      halfDayLimit: '11:00'
    },
    eveningSlot: {
      start: '14:00',
      end: '18:00',
      halfDayLimit: '16:00'
    },
    allowedBuffer: 15,
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    maxPaidLeavePerMonth: 2
  }
};

const initialState: SettingsState = {
  data: DEFAULT_SETTINGS,
  loading: false,
  error: null
};

export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async () => {
    const settingsRef = doc(db, 'settings', 'attendance');
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      await setDoc(settingsRef, DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }

    return settingsDoc.data() as SettingsState['data'];
  }
);

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settings: SettingsState['data']) => {
    const settingsRef = doc(db, 'settings', 'attendance');
    await setDoc(settingsRef, settings);
    return settings;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch settings';
      })
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update settings';
      });
  }
});

export default settingsSlice.reducer; 