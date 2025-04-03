import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  Timestamp,
  addDoc,
  deleteDoc,
  getFirestore,
  getDoc
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { 
  StaffMember, 
  DailyAttendance, 
  StaffFilters, 
  BiometricDevice, 
  MonthlyAttendance,
  AttendanceStatus 
} from '../../types/staff';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

interface StaffState {
  staff: StaffMember[];
  attendance: DailyAttendance[];
  monthlyAttendance: MonthlyAttendance[];
  biometricDevice: BiometricDevice;
  filters: StaffFilters;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: StaffState = {
  staff: [],
  attendance: [],
  monthlyAttendance: [],
  biometricDevice: {
    isConnected: false,
    deviceInfo: null,
    error: null
  },
  filters: {
    searchQuery: '',
    isActive: true,
    dateRange: {
      start: null,
      end: null,
    },
  },
  loading: false,
  error: null,
  lastUpdated: null
};

// Async thunks
export const fetchStaff = createAsyncThunk(
  'staff/fetchStaff',
  async (filters: StaffFilters) => {
    const staffRef = collection(db, 'staff');
    let q = query(staffRef);

    if (filters.branchId) {
      q = query(q, where('branchId', '==', filters.branchId));
    }
    if (typeof filters.isActive === 'boolean') {
      q = query(q, where('isActive', '==', filters.isActive));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StaffMember[];
  }
);

export const fetchStaffAttendance = createAsyncThunk(
  'staff/fetchStaffAttendance',
  async (date: string) => {
    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, where('date', '==', date));
    const querySnapshot = await getDocs(q);
    const attendanceData = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as DailyAttendance[];

    // Fetch staff details for each attendance record
    const dailyAttendance: DailyAttendance[] = await Promise.all(
      attendanceData.map(async (attendance) => {
        const staffDoc = await getDoc(doc(db, 'staff', attendance.staffId));
        const staffData = staffDoc.data() as StaffMember;
        
        return {
          ...attendance,
          id: attendance.id,
          staffId: attendance.staffId,
          branchId: attendance.branchId || staffData.branchId || 'default',
          date: attendance.date,
          morningSlot: attendance.morningSlot || { status: 'absent' },
          eveningSlot: attendance.eveningSlot || { status: 'absent' },
          status: attendance.status || 'absent',
          createdAt: attendance.createdAt || new Date().toISOString(),
          updatedAt: attendance.updatedAt || new Date().toISOString()
        };
      })
    );

    return { attendanceData, dailyAttendance };
  }
);

export const recordAttendance = createAsyncThunk(
  'staff/recordAttendance',
  async (attendance: Omit<DailyAttendance, 'id' | 'createdAt' | 'updatedAt'>) => {
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('staffId', '==', attendance.staffId),
      where('date', '==', attendance.date)
    );
    const querySnapshot = await getDocs(q);

    const now = new Date().toISOString();
    if (querySnapshot.empty) {
      // Create new attendance record
      const docRef = await addDoc(attendanceRef, {
        ...attendance,
        createdAt: now,
        updatedAt: now,
      });
      return { id: docRef.id, ...attendance, createdAt: now, updatedAt: now } as DailyAttendance;
    } else {
      // Update existing attendance record
      const docRef = doc(db, 'attendance', querySnapshot.docs[0].id);
      const updatedAttendance = {
        ...attendance,
        updatedAt: now,
      };
      await updateDoc(docRef, updatedAttendance);
      return { 
        id: querySnapshot.docs[0].id, 
        ...attendance, 
        createdAt: querySnapshot.docs[0].data().createdAt, 
        updatedAt: now 
      } as DailyAttendance;
    }
  }
);

const getTotalStatus = (attendance: DailyAttendance): AttendanceStatus => {
  if (attendance.status === 'paidLeave' || attendance.status === 'unpaidLeave') {
    return attendance.status;
  }

  const morningStatus = attendance.morningSlot?.status || 'absent';
  const eveningStatus = attendance.eveningSlot?.status || 'absent';

  if (morningStatus === 'present' && eveningStatus === 'present') {
    return 'present';
  } else if (morningStatus === 'present' || eveningStatus === 'present') {
    return 'halfDay';
  }

  return 'absent';
};

export const createStaffMember = createAsyncThunk(
  'staff/createStaffMember',
  async (staff: Omit<StaffMember, 'id' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const staffRef = collection(db, 'staff');
    const docRef = await addDoc(staffRef, {
      ...staff,
      updatedAt: now,
      joinDate: now
    });
    return {
      id: docRef.id,
      ...staff,
      updatedAt: now,
      joinDate: now
    } as StaffMember;
  }
);

export const updateStaffMember = createAsyncThunk(
  'staff/updateStaffMember',
  async (staffData: Partial<StaffMember>) => {
    const { id, ...updateData } = staffData;

    if (!id) {
      // Create new staff member
      const docRef = await addDoc(collection(db, 'staff'), {
        ...updateData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return {
        id: docRef.id,
        ...updateData,
      } as StaffMember;
    } else {
      // Update existing staff member
      const staffRef = doc(db, 'staff', id);
      await updateDoc(staffRef, {
        ...updateData,
        updatedAt: new Date().toISOString(),
      });
      return staffData as StaffMember;
    }
  }
);

export const calculateMonthlyAttendance = createAsyncThunk(
  'staff/calculateMonthlyAttendance',
  async ({ month, year }: { month: number; year: number }) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const q = query(
      collection(db, 'attendance'),
      where('date', '>=', format(startDate, 'yyyy-MM-dd')),
      where('date', '<=', format(endDate, 'yyyy-MM-dd'))
    );

    const querySnapshot = await getDocs(q);
    const attendanceData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DailyAttendance[];

    // Calculate attendance stats for each staff member
    const stats = new Map<string, MonthlyAttendance>();

    for (const record of attendanceData) {
      const staffDoc = await getDoc(doc(db, 'staff', record.staffId));
      const staffData = staffDoc.data() as StaffMember;
      
      const current = stats.get(record.staffId) || {
        staffId: record.staffId,
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        month,
        year,
        totalDays: endDate.getDate(),
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        totalWorkingDays: endDate.getDate(),
        attendancePercentage: 0
      };

      switch (record.status) {
        case 'present':
          current.presentDays++;
          break;
        case 'halfDay':
          current.halfDays++;
          break;
        case 'paidLeave':
          current.paidLeaveDays++;
          break;
        case 'unpaidLeave':
          current.unpaidLeaveDays++;
          break;
        case 'absent':
          current.absentDays++;
          break;
      }

      // Calculate attendance percentage
      const totalPresent = current.presentDays + (current.halfDays * 0.5);
      const totalLeaves = current.paidLeaveDays + current.unpaidLeaveDays;
      current.attendancePercentage = (totalPresent + totalLeaves) / current.totalWorkingDays * 100;

      stats.set(record.staffId, current);
    }

    return Array.from(stats.values());
  }
);

export const deleteAttendance = createAsyncThunk(
  'staff/deleteAttendance',
  async (attendanceId: string) => {
    const attendanceRef = doc(db, 'attendance', attendanceId);
    await deleteDoc(attendanceRef);
    return attendanceId;
  }
);

export const deleteStaff = createAsyncThunk(
  'staff/deleteStaff',
  async (staffId: string) => {
    try {
      // Delete staff document
      await deleteDoc(doc(db, 'staff', staffId));
      
      // Delete associated attendance records
      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, where('staffId', '==', staffId));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return staffId;
    } catch (error) {
      throw new Error('Failed to delete staff member');
    }
  }
);

export const updateAttendance = createAsyncThunk(
  'staff/updateAttendance',
  async (attendance: DailyAttendance) => {
    const attendanceRef = doc(db, 'attendance', attendance.id!);
    const now = new Date().toISOString();
    
    const updatedAttendance = {
      ...attendance,
      updatedAt: now
    };
    
    await setDoc(attendanceRef, updatedAttendance);
    return updatedAttendance;
  }
);

const staffSlice = createSlice({
  name: 'staff',
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
    },
    setBiometricDeviceStatus: (state, action) => {
      state.biometricDevice = {
        ...state.biometricDevice,
        ...action.payload,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaff.fulfilled, (state, action) => {
        state.staff = action.payload;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch staff';
      })
      .addCase(fetchStaffAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaffAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload.dailyAttendance;
      })
      .addCase(fetchStaffAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch attendance';
      })
      .addCase(recordAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(recordAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = [...state.attendance, action.payload];
      })
      .addCase(recordAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to record attendance';
      })
      .addCase(createStaffMember.fulfilled, (state, action) => {
        state.staff.unshift(action.payload);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateStaffMember.fulfilled, (state, action) => {
        const index = state.staff.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.staff[index] = action.payload;
        } else {
          state.staff.push(action.payload);
        }
      })
      .addCase(calculateMonthlyAttendance.fulfilled, (state, action) => {
        state.monthlyAttendance = action.payload;
      })
      .addCase(deleteAttendance.fulfilled, (state, action) => {
        state.attendance = state.attendance.filter(a => a.id !== action.payload);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteStaff.fulfilled, (state, action) => {
        state.staff = state.staff.filter(staff => staff.id !== action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete staff member';
      })
      .addCase(updateAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAttendance.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.attendance.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.attendance = [
            ...state.attendance.slice(0, index),
            action.payload,
            ...state.attendance.slice(index + 1)
          ];
        }
      })
      .addCase(updateAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update attendance';
      });
  }
});

export const { setFilters, updateLastUpdated, setBiometricDeviceStatus } = staffSlice.actions;

export default staffSlice.reducer; 