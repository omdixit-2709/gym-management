import { configureStore } from '@reduxjs/toolkit';
import memberReducer from './slices/memberSlice';

export const store = configureStore({
  reducer: {
    members: memberReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 