import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import { Member, SubscriptionType, PaymentStatus } from '../../types/member';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { addDays, addMonths, format } from 'date-fns';

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const subscriptionTypes: SubscriptionType[] = ['monthly', 'quarterly', 'semi-annual', 'annual'];
const paymentStatuses: PaymentStatus[] = ['paid', 'pending', 'overdue'];

const calculateEndDate = (startDate: string, subscriptionType: SubscriptionType): string => {
  const date = new Date(startDate);
  switch (subscriptionType) {
    case 'monthly':
      return addMonths(date, 1).toISOString();
    case 'quarterly':
      return addMonths(date, 3).toISOString();
    case 'semi-annual':
      return addMonths(date, 6).toISOString();
    case 'annual':
      return addMonths(date, 12).toISOString();
    default:
      return addMonths(date, 1).toISOString();
  }
};

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<Member>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subscriptionType: 'monthly',
    joinDate: format(new Date(), 'yyyy-MM-dd'),
    subscriptionEndDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    paymentStatus: 'pending',
    photoUrl: '',
    address: '',
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Automatically calculate subscription end date when join date or subscription type changes
      if (name === 'joinDate' || name === 'subscriptionType') {
        newData.subscriptionEndDate = format(
          new Date(calculateEndDate(
            newData.joinDate || new Date().toISOString(),
            newData.subscriptionType as SubscriptionType || 'monthly'
          )),
          'yyyy-MM-dd'
        );
      }
      
      return newData;
    });
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'subscriptionType', 'joinDate'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof Member]);
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      // Create new member document
      const memberData = {
        ...formData,
        joinDate: new Date(formData.joinDate!).toISOString(),
        subscriptionEndDate: new Date(formData.subscriptionEndDate!).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'members'), memberData);
      onSuccess();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      subscriptionType: 'monthly',
      joinDate: format(new Date(), 'yyyy-MM-dd'),
      subscriptionEndDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      paymentStatus: 'pending',
      photoUrl: '',
      address: '',
      isActive: true,
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Member</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Join Date"
              name="joinDate"
              type="date"
              value={formData.joinDate}
              onChange={handleChange}
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              select
              label="Subscription Type"
              name="subscriptionType"
              value={formData.subscriptionType}
              onChange={handleChange}
              required
            >
              {subscriptionTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Subscription End Date"
              name="subscriptionEndDate"
              type="date"
              value={formData.subscriptionEndDate}
              InputProps={{
                readOnly: true,
              }}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              select
              label="Payment Status"
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={handleChange}
              required
            >
              {paymentStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMemberDialog; 