import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Button,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { parseISO, format } from 'date-fns';
import { AttendanceSettings } from '../../types/settings';

interface Props {
  settings: AttendanceSettings;
  onSave: (settings: AttendanceSettings) => void;
}

const AttendanceSettingsComponent: React.FC<Props> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<AttendanceSettings>(settings);

  const handleTimeChange = (slot: 'morningSlot' | 'eveningSlot', type: 'startTime' | 'endTime') => (newTime: Date | null) => {
    if (newTime) {
      setLocalSettings(prev => ({
        ...prev,
        [slot]: {
          ...prev[slot],
          [type]: format(newTime, 'HH:mm')
        }
      }));
    }
  };

  const handleSlotLimitChange = (slot: 'morningSlot' | 'eveningSlot') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setLocalSettings(prev => ({
        ...prev,
        [slot]: {
          ...prev[slot],
          halfDayLimit: value
        }
      }));
    }
  };

  const handleNumberChange = (field: keyof AttendanceSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setLocalSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSwitchChange = (field: keyof AttendanceSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(localSettings);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader title="Attendance Settings" />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            {/* Morning Slot */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Morning Slot
              </Typography>
              <Box display="flex" gap={2}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <TimePicker
                    label="Start Time"
                    value={parseISO(`2000-01-01T${localSettings.morningSlot.startTime}`)}
                    onChange={handleTimeChange('morningSlot', 'startTime')}
                  />
                  <TimePicker
                    label="End Time"
                    value={parseISO(`2000-01-01T${localSettings.morningSlot.endTime}`)}
                    onChange={handleTimeChange('morningSlot', 'endTime')}
                  />
                </LocalizationProvider>
              </Box>
              <TextField
                fullWidth
                label="Half Day Limit (minutes)"
                type="number"
                value={localSettings.morningSlot.halfDayLimit}
                onChange={handleSlotLimitChange('morningSlot')}
                margin="normal"
              />
            </Grid>

            {/* Evening Slot */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Evening Slot
              </Typography>
              <Box display="flex" gap={2}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <TimePicker
                    label="Start Time"
                    value={parseISO(`2000-01-01T${localSettings.eveningSlot.startTime}`)}
                    onChange={handleTimeChange('eveningSlot', 'startTime')}
                  />
                  <TimePicker
                    label="End Time"
                    value={parseISO(`2000-01-01T${localSettings.eveningSlot.endTime}`)}
                    onChange={handleTimeChange('eveningSlot', 'endTime')}
                  />
                </LocalizationProvider>
              </Box>
              <TextField
                fullWidth
                label="Half Day Limit (minutes)"
                type="number"
                value={localSettings.eveningSlot.halfDayLimit}
                onChange={handleSlotLimitChange('eveningSlot')}
                margin="normal"
              />
            </Grid>

            {/* Leave Settings */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Leave Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localSettings.allowPaidLeave}
                        onChange={handleSwitchChange('allowPaidLeave')}
                      />
                    }
                    label="Allow Paid Leave"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Paid Leave Per Month"
                    type="number"
                    value={localSettings.maxPaidLeavePerMonth}
                    onChange={handleNumberChange('maxPaidLeavePerMonth')}
                    disabled={!localSettings.allowPaidLeave}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Paid Leave Per Year"
                    type="number"
                    value={localSettings.maxPaidLeavePerYear}
                    onChange={handleNumberChange('maxPaidLeavePerYear')}
                    disabled={!localSettings.allowPaidLeave}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Half Day Settings */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.halfDayCount}
                    onChange={handleSwitchChange('halfDayCount')}
                  />
                }
                label="Enable Half Day Attendance"
              />
            </Grid>
          </Grid>
        </CardContent>
        <Divider />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" color="primary">
            Save Settings
          </Button>
        </Box>
      </Card>
    </form>
  );
};

export default AttendanceSettingsComponent; 