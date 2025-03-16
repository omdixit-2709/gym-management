import { configureStore } from '@reduxjs/toolkit';
import memberReducer from './slices/memberSlice';
import dashboardReducer from './slices/dashboardSlice';
import analyticsReducer from './slices/analyticsSlice';
import walkInReducer from './slices/walkInSlice';

export const store = configureStore({
  reducer: {
    members: memberReducer,
    dashboard: dashboardReducer,
    analytics: analyticsReducer,
    walkIns: walkInReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 