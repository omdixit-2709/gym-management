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
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Refresh as ResetIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { importFromExcel } from '../../services/staffDataService';
import { format } from 'date-fns';

interface ImportStaffDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewRow {
  'First Name': string;
  'Last Name': string;
  Email: string;
  Phone: string;
  Address?: string;
  Designation: string;
  'Join Date': string;
  Notes?: string;
}

const steps = ['Upload File', 'Validate Data', 'Import'];

const ImportStaffDialog: React.FC<ImportStaffDialogProps> = ({ open, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as PreviewRow[];
        setPreviewData(jsonData);
        setActiveStep(1);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Failed to read file. Please make sure it is a valid Excel file.');
      console.error('File read error:', err);
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setImporting(true);
    setProgress(0);
    setActiveStep(2);

    try {
      const file = fileInputRef.current?.files?.[0];
      if (!file) throw new Error('No file selected');

      await importFromExcel(file);
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to import staff. Please try again.');
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Email': 'john@example.com',
        'Phone': '1234567890',
        'Address': '123 Main St',
        'Designation': 'Trainer',
        'Join Date': format(new Date(), 'yyyy-MM-dd'),
        'Notes': 'Sample staff member'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Add column widths
    ws['!cols'] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 30 }, // Address
      { wch: 20 }, // Designation
      { wch: 12 }, // Join Date
      { wch: 30 }, // Notes
    ];

    XLSX.writeFile(wb, 'staff-import-template.xlsx');
  };

  const handleReset = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
    setPreviewData([]);
    setActiveStep(0);
    setProgress(0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Staff</DialogTitle>
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
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <Typography variant="body1" textAlign="center">
              Upload an Excel file containing staff information.
              Make sure to follow the template format.
            </Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
              >
                Download Template
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
              >
                Upload File
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                />
              </Button>
            </Box>
          </Box>
        )}

        {activeStep === 1 && previewData.length > 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Preview ({previewData.length} records)
              </Typography>
              <Tooltip title="Reset">
                <IconButton onClick={handleReset} size="small">
                  <ResetIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>First Name</TableCell>
                    <TableCell>Last Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Designation</TableCell>
                    <TableCell>Join Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row['First Name']}</TableCell>
                      <TableCell>{row['Last Name']}</TableCell>
                      <TableCell>{row.Email}</TableCell>
                      <TableCell>{row.Phone}</TableCell>
                      <TableCell>{row.Designation}</TableCell>
                      <TableCell>{row['Join Date']}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {previewData.length > 5 && (
              <Typography variant="caption" color="text.secondary" mt={1}>
                Showing first 5 records of {previewData.length}
              </Typography>
            )}
          </Box>
        )}

        {activeStep === 2 && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress variant="determinate" value={progress} size={60} />
            <Typography>
              Importing staff... {Math.round(progress)}%
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={importing || previewData.length === 0}
          >
            Import {previewData.length} Records
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportStaffDialog; 