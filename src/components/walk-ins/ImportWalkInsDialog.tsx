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
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Refresh as ResetIcon,
  Check as ValidIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { WalkIn } from '../../types/walkIn';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { format, isValid, parse } from 'date-fns';
import { showSuccess, showError } from '../../services/notificationService';

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

const steps = ['Upload File', 'Validate Data', 'Import'];

const ImportWalkInsDialog: React.FC<ImportWalkInsDialogProps> = ({ open, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ row: number; errors: string[] }[]>([]);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState(0);

  const parseDate = (dateStr: string): Date | null => {
    // Try different date formats
    const formats = [
      'yyyy-MM-dd',
      'dd/MM/yyyy',
      'MM/dd/yyyy',
      'dd-MM-yyyy',
      'MM-dd-yyyy'
    ];

    for (const dateFormat of formats) {
      const parsedDate = parse(dateStr, dateFormat, new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }

    // Handle Excel serial number dates
    const serialNumber = parseFloat(dateStr);
    if (!isNaN(serialNumber)) {
      const excelDate = new Date(Date.UTC(1899, 11, 30 + serialNumber));
      if (isValid(excelDate)) {
        return excelDate;
      }
    }

    return null;
  };

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
      const visitDate = parseDate(row['Visit Date']);
      const followUpDate = parseDate(row['Follow-up Date']);

      if (!visitDate) {
        rowErrors.push('Invalid Visit Date format');
      }
      if (!followUpDate) {
        rowErrors.push('Invalid Follow-up Date format');
      }

      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (row['Follow-up Time'] && !timeRegex.test(row['Follow-up Time'])) {
        rowErrors.push('Invalid Follow-up Time format (use HH:mm)');
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setValidationErrors([]);
    setImportData([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];

      setImportData(jsonData);
      
      // Validate data
      const validation = validateImportData(jsonData);
      setValidationErrors(validation.errors);
      
      if (validation.isValid) {
        setActiveStep(1);
      }
    } catch (err) {
      setError('Failed to read file. Please check the format.');
      console.error('File read error:', err);
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) return;

    setImporting(true);
    setProgress(0);
    setActiveStep(2);

    try {
      let imported = 0;
      for (const row of importData) {
        const visitDate = parseDate(row['Visit Date']);
        const followUpDate = parseDate(row['Follow-up Date']);

        if (!visitDate || !followUpDate) {
          throw new Error('Invalid date format');
        }

        const walkIn: Omit<WalkIn, 'id'> = {
          name: row.Name,
          email: row.Email || '',
          phone: row.Phone,
          address: row.Address || '',
          visitDate: format(visitDate, 'yyyy-MM-dd'),
          interestLevel: row['Interest Level'].toLowerCase() as WalkIn['interestLevel'],
          followUpDate: format(followUpDate, 'yyyy-MM-dd'),
          followUpTime: row['Follow-up Time'],
          status: row.Status.toLowerCase().replace(' ', '_') as WalkIn['status'],
          notes: row.Notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await addDoc(collection(db, 'walkIns'), walkIn);
        imported++;
        setProgress((imported / importData.length) * 100);
      }

      showSuccess(`Successfully imported ${imported} walk-ins`);
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to import walk-ins. Please try again.');
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        Name: 'John Doe',
        Email: 'john@example.com',
        Phone: '1234567890',
        Address: '123 Main St',
        'Visit Date': format(new Date(), 'yyyy-MM-dd'),
        'Interest Level': 'High',
        'Follow-up Date': format(new Date(), 'yyyy-MM-dd'),
        'Follow-up Time': '10:00',
        Status: 'Pending',
        Notes: 'Initial visit'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Add column widths
    ws['!cols'] = [
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 30 }, // Address
      { wch: 12 }, // Visit Date
      { wch: 15 }, // Interest Level
      { wch: 12 }, // Follow-up Date
      { wch: 12 }, // Follow-up Time
      { wch: 15 }, // Status
      { wch: 30 }, // Notes
    ];

    XLSX.writeFile(wb, 'walk-ins-import-template.xlsx');
  };

  const handleReset = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
    setValidationErrors([]);
    setImportData([]);
    setActiveStep(0);
    setProgress(0);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '60vh' } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Import Walk-ins</Typography>
          <Box>
            <Tooltip title="Download Template">
              <IconButton onClick={handleDownloadTemplate} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset">
              <IconButton onClick={handleReset} size="small">
                <ResetIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'grey.300',
                borderRadius: 1,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon sx={{ fontSize: 48, color: 'action.active', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Click to Upload File
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported formats: XLSX, XLS, CSV
              </Typography>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Required Columns:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Name, Phone, Visit Date, Follow-up Date, Follow-up Time"
                    secondary="These fields are mandatory"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Interest Level"
                    secondary="Must be: high, medium, or low"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Status"
                    secondary="Must be: pending, converted, or not interested"
                  />
                </ListItem>
              </List>
            </Box>
          </Box>
        )}

        {activeStep === 1 && importData.length > 0 && (
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1">
                Preview ({importData.length} records)
              </Typography>
              <Box>
                {validationErrors.length > 0 ? (
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${validationErrors.length} errors found`}
                    color="error"
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    icon={<ValidIcon />}
                    label="Valid data"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Visit Date</TableCell>
                    <TableCell>Follow-up</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Validation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importData.map((row, index) => {
                    const rowErrors = validationErrors.find(e => e.row === index + 1);
                    return (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{row.Name}</TableCell>
                        <TableCell>{row.Phone}</TableCell>
                        <TableCell>{row['Visit Date']}</TableCell>
                        <TableCell>{`${row['Follow-up Date']} ${row['Follow-up Time']}`}</TableCell>
                        <TableCell>{row.Status}</TableCell>
                        <TableCell>
                          {rowErrors ? (
                            <Tooltip title={rowErrors.errors.join('\n')}>
                              <ErrorIcon color="error" />
                            </Tooltip>
                          ) : (
                            <ValidIcon color="success" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {validationErrors.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Please fix the validation errors before importing.
              </Alert>
            )}
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress variant="determinate" value={progress} size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Importing... {Math.round(progress)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please don't close this window
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={validationErrors.length > 0 || importing}
          >
            Import {importData.length} Records
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportWalkInsDialog; 