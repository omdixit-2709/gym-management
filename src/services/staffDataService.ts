import { StaffMember } from '../types/staff';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { showSuccess, showError } from './notificationService';

interface ImportRow {
  'First Name': string;
  'Last Name': string;
  Email: string;
  Phone: string;
  Address?: string;
  Designation: string;
  'Join Date': string;
  Notes?: string;
}

export const exportToExcel = (staff: StaffMember[], fileName: string = 'staff-list') => {
  try {
    const data = staff.map((member, index) => ({
      'Sr. No.': (index + 1).toString(),
      'First Name': member.firstName,
      'Last Name': member.lastName,
      'Email': member.email,
      'Phone': member.phone,
      'Address': member.address,
      'Designation': member.designation,
      'Join Date': format(new Date(member.joinDate), 'dd/MM/yyyy'),
      'Notes': member.notes,
      'Created At': format(new Date(member.createdAt), 'dd/MM/yyyy HH:mm'),
      'Updated At': format(new Date(member.updatedAt), 'dd/MM/yyyy HH:mm')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');

    // Add BOM for Excel to properly detect UTF-8
    const BOM = '\uFEFF';
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = format(new Date(), 'dd-MM-yyyy');
    a.download = `${fileName}-${timestamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showSuccess('Staff list exported successfully');
  } catch (error) {
    showError('Failed to export staff list');
    console.error('Export error:', error);
  }
};

export const validateImportData = (data: ImportRow[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 1;
    if (!row['First Name']?.trim()) errors.push(`Row ${rowNum}: First Name is required`);
    if (!row['Last Name']?.trim()) errors.push(`Row ${rowNum}: Last Name is required`);
    if (!row['Email']?.trim()) errors.push(`Row ${rowNum}: Email is required`);
    if (!row['Phone']?.trim()) errors.push(`Row ${rowNum}: Phone is required`);
    if (!row['Designation']?.trim()) errors.push(`Row ${rowNum}: Designation is required`);
    if (!row['Join Date']?.trim()) errors.push(`Row ${rowNum}: Join Date is required`);
  });

  return {
    isValid: errors.length === 0,
    errors
  };
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
        const staff: Omit<StaffMember, 'id'> = {
          firstName: row['First Name'],
          lastName: row['Last Name'],
          email: row.Email,
          phone: row.Phone,
          address: row.Address || '',
          designation: row.Designation,
          joinDate: format(new Date(row['Join Date']), 'yyyy-MM-dd'),
          notes: row.Notes || '',
          isActive: true,
          branchId: 'default', // Add default branchId
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'staff'), staff);
      }

      showSuccess(`${jsonData.length} staff members imported successfully`);
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    showError('Failed to import staff');
    console.error('Import error:', error);
  }
};

export const createStaffMember = async (staff: Omit<StaffMember, 'id' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  const staffRef = collection(db, 'staff');
  const docRef = await addDoc(staffRef, {
    ...staff,
    branchId: staff.branchId || 'default', // Use provided branchId or default
    updatedAt: now,
    joinDate: now
  });
  return {
    id: docRef.id,
    ...staff,
    branchId: staff.branchId || 'default', // Use provided branchId or default
    updatedAt: now,
    joinDate: now
  } as StaffMember;
}; 