import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import Papa from 'papaparse';
import { ImportMemberData } from '../../types/member';
import { importMembers } from '../../store/slices/memberSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { validateMemberData } from '../../utils/memberValidation';

interface ImportMembersDialogProps {
  open: boolean;
  onClose: () => void;
}

const ImportMembersDialog: React.FC<ImportMembersDialogProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ row: number; errors: string[] }[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setValidationErrors([]);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Validate the data
          const validation = validateMemberData(results.data);
          
          if (!validation.isValid) {
            setValidationErrors(validation.errors);
            return;
          }

          setImporting(true);
          const members = results.data.map((row) => ({
            firstName: row.FirstName.trim(),
            lastName: row.LastName.trim(),
            email: row.Email.trim(),
            phone: row.Phone.trim(),
            subscriptionType: row.SubscriptionType.toLowerCase() as ImportMemberData['subscriptionType'],
            subscriptionStartDate: row.SubscriptionStartDate ? new Date(row.SubscriptionStartDate).toISOString() : undefined,
            subscriptionEndDate: new Date(row.SubscriptionEndDate).toISOString(),
          }));

          await dispatch(importMembers(members));
          onClose();
        } catch (err) {
          setError('Failed to import members. Please check the file format.');
        } finally {
          setImporting(false);
        }
      },
      error: () => {
        setError('Failed to parse CSV file. Please check the file format.');
      },
    });
  };

  const handleDownloadTemplate = () => {
    const template = [
      'FirstName,LastName,Email,Phone,SubscriptionType,SubscriptionStartDate,SubscriptionEndDate',
      'John,Doe,john@example.com,1234567890,monthly,2024-06-01,2024-06-30',
      'Jane,Smith,jane@example.com,0987654321,quarterly,2024-06-01,2024-09-30',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
    setValidationErrors([]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Members</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload a CSV file containing member information. The file must include these columns:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="FirstName, LastName: Member's full name"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Email: Valid email address"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Phone: At least 10 digits, can include spaces and hyphens"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="SubscriptionType: monthly, quarterly, semi-annual, or annual"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="SubscriptionStartDate: Start date in YYYY-MM-DD format"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="SubscriptionEndDate: Future date in YYYY-MM-DD format"
              />
            </ListItem>
          </List>
          <Button
            size="small"
            onClick={handleDownloadTemplate}
            sx={{ mt: 1 }}
          >
            Download Template
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Please fix the following errors:
            </Typography>
            <List dense>
              {validationErrors.map((error, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`Row ${error.row}:`}
                    secondary={error.errors.join(', ')}
                  />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        <Box
          sx={{
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography>
            Click to upload or drag and drop CSV file here
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={importing || validationErrors.length > 0}
        >
          {importing ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportMembersDialog; 