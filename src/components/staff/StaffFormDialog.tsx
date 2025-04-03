import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Avatar,
  Box,
  IconButton,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { StaffMember } from '../../types/staff';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updateStaffMember } from '../../store/slices/staffSlice';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format, parseISO } from 'date-fns';

interface StaffFormDialogProps {
  open: boolean;
  onClose: () => void;
  staff: StaffMember | null;
}

const StaffFormDialog: React.FC<StaffFormDialogProps> = ({ open, onClose, staff }) => {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<Partial<StaffMember>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    designation: '',
    photoUrl: '',
    isActive: true,
    joinDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staff) {
      setFormData(staff);
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        designation: '',
        photoUrl: '',
        isActive: true,
        joinDate: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    }
    setError(null);
  }, [staff]);

  const handleInputChange = (field: keyof StaffMember) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setPhotoFile(event.target.files[0]);
    }
  };

  const validateForm = () => {
    if (!formData.firstName?.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName?.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email?.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.phone?.trim()) {
      setError('Phone is required');
      return false;
    }
    if (!formData.designation?.trim()) {
      setError('Designation is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    
    try {
      let photoUrl = formData.photoUrl;

      if (photoFile) {
        const storageRef = ref(storage, `staff-photos/${Date.now()}-${photoFile.name}`);
        const snapshot = await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(snapshot.ref);
      }

      const staffData = {
        ...formData,
        photoUrl,
        updatedAt: new Date().toISOString(),
      };

      if (staff?.id) {
        staffData.id = staff.id;
      }

      await dispatch(updateStaffMember(staffData)).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to save staff member:', error);
      setError(error instanceof Error ? error.message : 'Failed to save staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Box sx={{ mb: 2, mt: 1 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} display="flex" justifyContent="center">
            <Box position="relative">
              <Avatar
                src={photoFile ? URL.createObjectURL(photoFile) : formData.photoUrl}
                sx={{ width: 100, height: 100 }}
              />
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: -10,
                  right: -10,
                  backgroundColor: 'background.paper',
                }}
                component="label"
              >
                <input
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={handlePhotoChange}
                />
                <PhotoCamera />
              </IconButton>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange('firstName')}
              required
              error={Boolean(error && !formData.firstName)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange('lastName')}
              required
              error={Boolean(error && !formData.lastName)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              required
              error={Boolean(error && !formData.email)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              required
              error={Boolean(error && !formData.phone)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              value={formData.address}
              onChange={handleInputChange('address')}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Designation"
              value={formData.designation}
              onChange={handleInputChange('designation')}
              required
              error={Boolean(error && !formData.designation)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DatePicker
              label="Join Date"
              value={parseISO(formData.joinDate || format(new Date(), 'yyyy-MM-dd'))}
              onChange={(date) => {
                if (date) {
                  setFormData({
                    ...formData,
                    joinDate: format(date, 'yyyy-MM-dd'),
                  });
                }
              }}
              sx={{ width: '100%' }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              value={formData.notes}
              onChange={handleInputChange('notes')}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StaffFormDialog; 