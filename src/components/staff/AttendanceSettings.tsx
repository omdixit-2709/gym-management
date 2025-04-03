import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { format, parse } from 'date-fns';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { AttendanceSettings as AttendanceSettingsType } from '../../types/staff';

const WORKING_DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
] as const;

const DEFAULT_SETTINGS: AttendanceSettingsType = {
  morningSlot: {
    start: '06:00',
    end: '11:00',
    halfDayLimit: '08:30'
  },
  eveningSlot: {
    start: '18:00',
    end: '22:00',
    halfDayLimit: '19:30'
  },
  allowedBuffer: 15,
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
};

const AttendanceSettings: React.FC = () => {
  const [settings, setSettings] = useState<AttendanceSettingsType>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const settingsDoc = await getDoc(doc(db, 'settings', 'attendance'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as AttendanceSettingsType);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setError('Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleTimeChange = (slot: 'morning' | 'evening', type: 'start' | 'end', value: Date | null) => {
    if (!value) return;

    setSettings((prev) => ({
      ...prev,
      [`${slot}Slot`]: {
        ...prev[`${slot}Slot`],
        [type]: format(value, 'HH:mm'),
      },
    }));
  };

  const handleBufferChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 0) {
      setSettings((prev) => ({
        ...prev,
        allowedBuffer: value,
      }));
    }
  };

  const handleWorkingDayChange = (day: typeof WORKING_DAYS[number]['value']) => {
    setSettings((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await setDoc(doc(db, 'settings', 'attendance'), settings);
      setSuccess(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !settings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Attendance Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Morning Slot
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TimePicker
                    label="Start Time"
                    value={parse(settings.morningSlot.start, 'HH:mm', new Date())}
                    onChange={(value) => handleTimeChange('morning', 'start', value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TimePicker
                    label="End Time"
                    value={parse(settings.morningSlot.end, 'HH:mm', new Date())}
                    onChange={(value) => handleTimeChange('morning', 'end', value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Evening Slot
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TimePicker
                    label="Start Time"
                    value={parse(settings.eveningSlot.start, 'HH:mm', new Date())}
                    onChange={(value) => handleTimeChange('evening', 'start', value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TimePicker
                    label="End Time"
                    value={parse(settings.eveningSlot.end, 'HH:mm', new Date())}
                    onChange={(value) => handleTimeChange('evening', 'end', value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                General Settings
              </Typography>
              <TextField
                fullWidth
                label="Allowed Buffer Time (minutes)"
                type="number"
                value={settings.allowedBuffer}
                onChange={handleBufferChange}
                sx={{ mb: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Working Days
              </Typography>
              <FormControl>
                {WORKING_DAYS.map((day) => (
                  <FormControlLabel
                    key={day.value}
                    control={
                      <Checkbox
                        checked={settings.workingDays.includes(day.value)}
                        onChange={() => handleWorkingDayChange(day.value)}
                      />
                    }
                    label={day.label}
                  />
                ))}
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Settings saved successfully
        </Alert>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default AttendanceSettings; 