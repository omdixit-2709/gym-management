import { WalkIn, InterestLevel, WalkInStatus } from '../types/walkIn';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { showSuccess, showError } from './notificationService';

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

export const exportToExcel = (walkIns: WalkIn[], fileName: string = 'walk-ins.xlsx') => {
  try {
    const data = walkIns.map((walkIn, index) => ({
      'Sr. No.': (index + 1).toString(),
      'Name': walkIn.name,
      'Email': walkIn.email,
      'Phone': walkIn.phone,
      'Address': walkIn.address,
      'Visit Date': format(new Date(walkIn.visitDate), 'dd/MM/yyyy'),
      'Interest Level': walkIn.interestLevel.charAt(0).toUpperCase() + walkIn.interestLevel.slice(1),
      'Follow-up Date': format(new Date(walkIn.followUpDate), 'dd/MM/yyyy'),
      'Follow-up Time': walkIn.followUpTime,
      'Status': walkIn.status.replace('_', ' ').charAt(0).toUpperCase() + walkIn.status.replace('_', ' ').slice(1),
      'Notes': walkIn.notes,
      'Created At': format(new Date(walkIn.createdAt), 'dd/MM/yyyy HH:mm'),
      'Updated At': format(new Date(walkIn.updatedAt), 'dd/MM/yyyy HH:mm')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Walk-ins');

    // Add BOM for Excel to properly detect UTF-8
    const BOM = '\uFEFF';
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = format(new Date(), 'dd-MM-yyyy');
    a.download = `${fileName.replace('.xlsx', '')}-${timestamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showSuccess('Walk-ins exported successfully');
  } catch (error) {
    showError('Failed to export walk-ins');
    console.error('Export error:', error);
  }
};

export const exportToPDF = (walkIns: WalkIn[], fileName: string = 'walk-ins.pdf') => {
  // Implement PDF export using a library like jsPDF
  // This is a placeholder for future implementation
};

export const importFromExcel = async (file: File): Promise<void> => {
  try {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];

      // Validate data before importing
      const validation = validateImportData(jsonData);
      if (!validation.isValid) {
        showError(`Import validation failed:\n${validation.errors.join('\n')}`);
        return;
      }

      for (const row of jsonData) {
        const walkIn: Omit<WalkIn, 'id'> = {
          name: row.Name,
          email: row.Email || '',
          phone: row.Phone,
          address: row.Address || '',
          visitDate: format(new Date(row['Visit Date']), 'yyyy-MM-dd'),
          interestLevel: row['Interest Level'].toLowerCase() as InterestLevel,
          followUpDate: format(new Date(row['Follow-up Date']), 'yyyy-MM-dd'),
          followUpTime: row['Follow-up Time'],
          status: row.Status.toLowerCase().replace(' ', '_') as WalkInStatus,
          notes: row.Notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await addDoc(collection(db, 'walkIns'), walkIn);
      }

      showSuccess(`${jsonData.length} walk-ins imported successfully`);
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    showError('Failed to import walk-ins');
    console.error('Import error:', error);
  }
};

export const validateImportData = (data: ImportRow[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const requiredFields = ['Name', 'Phone', 'Visit Date', 'Follow-up Date', 'Follow-up Time'];

  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field as keyof ImportRow]) {
        errors.push(`Row ${index + 1}: Missing ${field}`);
      }
    });

    // Validate date formats
    try {
      new Date(row['Visit Date']);
      new Date(row['Follow-up Date']);
    } catch {
      errors.push(`Row ${index + 1}: Invalid date format`);
    }

    // Validate interest level
    if (row['Interest Level'] && !['high', 'medium', 'low'].includes(row['Interest Level'].toLowerCase())) {
      errors.push(`Row ${index + 1}: Invalid interest level. Must be high, medium, or low`);
    }

    // Validate status
    if (row.Status && !['pending', 'converted', 'not interested'].includes(row.Status.toLowerCase())) {
      errors.push(`Row ${index + 1}: Invalid status. Must be pending, converted, or not interested`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}; 