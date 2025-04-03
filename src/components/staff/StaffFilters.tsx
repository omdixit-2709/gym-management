import React from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Paper,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { setFilters } from '../../store/slices/staffSlice';
import { format } from 'date-fns';

const StaffFilters: React.FC = () => {
  const dispatch = useAppDispatch();
  const filters = useSelector((state: RootState) => state.staff.filters);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setFilters({
      ...filters,
      searchQuery: event.target.value,
    }));
  };

  const handleActiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setFilters({
      ...filters,
      isActive: event.target.checked,
    }));
  };

  const handleStartDateChange = (date: Date | null) => {
    dispatch(setFilters({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        start: date ? format(date, 'yyyy-MM-dd') : null,
      },
    }));
  };

  const handleEndDateChange = (date: Date | null) => {
    dispatch(setFilters({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        end: date ? format(date, 'yyyy-MM-dd') : null,
      },
    }));
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={filters.searchQuery || ''}
          onChange={handleSearchChange}
          sx={{ minWidth: 200 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={filters.isActive || false}
              onChange={handleActiveChange}
            />
          }
          label="Active Only"
        />
        <Box display="flex" gap={2}>
          <DatePicker
            label="Start Date"
            value={filters.dateRange?.start ? new Date(filters.dateRange.start) : null}
            onChange={handleStartDateChange}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="End Date"
            value={filters.dateRange?.end ? new Date(filters.dateRange.end) : null}
            onChange={handleEndDateChange}
            slotProps={{ textField: { size: 'small' } }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default StaffFilters; 