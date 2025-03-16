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
import * as XLSX from 'xlsx';
import { WalkIn } from '../../types/walkIn';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { format, parseISO } from 'date-fns';

interface ImportWalkInsDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportRow {
  Name: string;
  Email?: string;
  Phone: string;
  Address?: string;
  'Visit Date': string;
  'Interest Level': string;
  'Follow-up Date': string;
  'Follow-up Time': string;
  Status: string;
  Notes?: string;
}

const ImportWalkInsDialog: React.FC<ImportWalkInsDialogProps> = ({ open, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ row: number; errors: string[] }[]>([]);
  const [importing, setImporting] = useState(false);

  const validateImportData = (data: ImportRow[]): { isValid: boolean; errors: { row: number; errors: string[] }[] } => {
    const errors: { row: number; errors: string[] }[] = [];
    const requiredFields = ['Name', 'Phone', 'Visit Date', 'Follow-up Date', 'Follow-up Time'];
  
    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      
      // Check required fields
      requiredFields.forEach(field => {
        if (!row[field as keyof ImportRow]) {
          rowErrors.push(`Missing ${field}`);
        }
      });
  
      // Validate dates
      try {
        if (row['Visit Date']) {
          parseISO(row['Visit Date']);
        }
        if (row['Follow-up Date']) {
          parseISO(row['Follow-up Date']);
        }
      } catch {
        rowErrors.push('Invalid date format. Use YYYY-MM-DD');
      }
  
      // Validate interest level
      if (row['Interest Level'] && !['high', 'medium', 'low'].includes(row['Interest Level'].toLowerCase())) {
        rowErrors.push('Interest level must be high, medium, or low');
      }
  
      // Validate status
      if (row.Status && !['pending', 'converted', 'not_interested'].includes(row.Status.toLowerCase().replace(' ', '_'))) {
        rowErrors.push('Status must be pending, converted, or not interested');
      }
  
      if (rowErrors.length > 0) {
        errors.push({ row: index + 1, errors: rowErrors });
      }
    });
  
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setValidationErrors([]);

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];

        // Validate data before importing
        const validation = validateImportData(jsonData);
        if (!validation.isValid) {
          setValidationErrors(validation.errors);
          return;
        }

        setImporting(true);
        
        for (const row of jsonData) {
          const walkIn: Omit<WalkIn, 'id'> = {
            name: row.Name,
            email: row.Email || '',
            phone: row.Phone,
            address: row.Address || '',
            visitDate: format(parseISO(row['Visit Date']), 'yyyy-MM-dd'),
            interestLevel: row['Interest Level'].toLowerCase() as WalkIn['interestLevel'],
            followUpDate: format(parseISO(row['Follow-up Date']), 'yyyy-MM-dd'),
            followUpTime: row['Follow-up Time'],
            status: row.Status.toLowerCase().replace(' ', '_') as WalkIn['status'],
            notes: row.Notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await addDoc(collection(db, 'walkIns'), walkIn);
        }

        onSuccess();
        onClose();
      } catch (err) {
        setError('Failed to import walk-ins. Please check the file format.');
        console.error('Import error:', err);
      } finally {
        setImporting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const template = [
      'Name,Email,Phone,Address,Visit Date,Interest Level,Follow-up Date,Follow-up Time,Status,Notes',
      'John Doe,john@example.com,1234567890,123 Main St,2024-03-15,High,2024-03-22,10:00,Pending,Initial visit',
      'Jane Smith,jane@example.com,0987654321,456 Oak Ave,2024-03-16,Medium,2024-03-23,14:30,Pending,Interested in monthly plan'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'walk-ins-import-template.csv';
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
      <DialogTitle>Import Walk-ins</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload an Excel file containing walk-in information. The file must include these columns:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="Name: Full name of the walk-in client" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Email: Optional email address" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Phone: Contact number" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Visit Date: Date in YYYY-MM-DD format" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Interest Level: high, medium, or low" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Follow-up Date: Date in YYYY-MM-DD format" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Follow-up Time: Time in HH:mm format" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Status: pending, converted, or not interested" />
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
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography>
            Click to upload or drag and drop Excel file here
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

export default ImportWalkInsDialog; 