import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { format, addMonths, addDays, isFuture, parseISO } from 'date-fns';

interface RawMember {
  'Sr No. ': string;
  'Client\'s Name': string;
  'Contact Number ': string;
  'Join Date': string;
  'End Date': string;
  'Subscription': string;
  'Status': string;
}

// Map subscription types to valid values and their durations in months
const subscriptionMap: { [key: string]: { type: string; months: number } } = {
  '1 Month': { type: 'monthly', months: 1 },
  '1 month': { type: 'monthly', months: 1 },
  '01 Month': { type: 'monthly', months: 1 },
  '2 months': { type: 'monthly', months: 2 },
  '3 Months': { type: 'quarterly', months: 3 },
  '3 months': { type: 'quarterly', months: 3 },
  '6 Months': { type: 'semi-annual', months: 6 },
  '6 months': { type: 'semi-annual', months: 6 },
  'Annual': { type: 'annual', months: 12 },
  '12 Months': { type: 'annual', months: 12 },
  '12 months': { type: 'annual', months: 12 },
  'annual': { type: 'annual', months: 12 }
};

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'no data' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';
  
  try {
    // Handle different date formats
    const cleanDate = dateStr.replace(/\//g, '-');
    const [day, month, year] = cleanDate.split('-').map(part => part.trim());
    
    // Ensure year is 4 digits
    const fullYear = year.length === 2 ? `20${year}` : year;
    
    // Create date object
    const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
    
    // Format to YYYY-MM-DD
    return format(date, 'yyyy-MM-dd');
  } catch (e) {
    return '';
  }
}

function formatPhone(phone: string): string {
  if (!phone || phone.trim() === '') {
    // Return a default valid phone number for missing numbers
    return '9999999999';
  }
  
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If number is too short, pad with 9s at the start
  if (digits.length < 10) {
    digits = '9'.repeat(10 - digits.length) + digits;
  }
  
  // If number is too long, take the last 10 digits
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  
  return digits;
}

function generateEmail(firstName: string, lastName: string, phone: string): string {
  // Clean and lowercase the names
  const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Take last 4 digits of phone number
  const phoneDigits = phone.slice(-4);
  
  // If no valid name parts, use a fallback
  if (!cleanFirstName && !cleanLastName) {
    return `member${phoneDigits}@nodata.com`;
  }
  
  // Construct email using name parts and phone digits
  const emailName = cleanFirstName + (cleanLastName ? '.' + cleanLastName : '') + phoneDigits;
  return `${emailName}@nodata.com`;
}

function getSubscriptionInfo(type: string): { type: string; months: number } {
  if (!type || type.trim() === '') {
    return { type: 'monthly', months: 1 };
  }
  
  // Clean up the type string
  const cleanType = type.trim().replace(/\s+/g, ' ');
  
  // Check if it's in our map
  return subscriptionMap[cleanType] || { type: 'monthly', months: 1 };
}

function calculateStartDate(endDateStr: string, months: number): string {
  try {
    const endDate = parseISO(endDateStr);
    // If end date is in the past, return empty string
    if (!isFuture(endDate)) {
      return '';
    }
    // Calculate start date by subtracting months from end date
    const startDate = addDays(addMonths(endDate, -months), 1);
    return format(startDate, 'yyyy-MM-dd');
  } catch (e) {
    return '';
  }
}

// Read the input CSV file
const inputFile = path.join(__dirname, '../members.csv');
const outputFile = path.join(__dirname, '../converted_members.csv');

const fileContent = fs.readFileSync(inputFile, 'utf-8');
const records = csv.parse(fileContent, {
  columns: true,
  skip_empty_lines: true
}) as RawMember[];

// Create header for new CSV
const header = 'FirstName,LastName,Email,Phone,SubscriptionType,SubscriptionStartDate,SubscriptionEndDate\n';

const today = new Date();

// Convert records
const convertedRecords = records
  .filter(record => {
    // Filter out empty names
    if (!record['Client\'s Name'] || record['Client\'s Name'].trim() === '') {
      return false;
    }
    
    // Filter out records with "Client's Name" as the name
    if (record['Client\'s Name'].toLowerCase().includes('client\'s name')) {
      return false;
    }

    // Parse end date
    const endDate = formatDate(record['End Date']);
    if (!endDate) {
      return false;
    }

    // Only include records with future end dates
    return isFuture(parseISO(endDate));
  })
  .map(record => {
    const { firstName, lastName } = parseName(record['Client\'s Name']);
    const phone = formatPhone(record['Contact Number ']);
    const endDate = formatDate(record['End Date']);
    const { type: subscriptionType, months } = getSubscriptionInfo(record['Subscription']);
    const startDate = calculateStartDate(endDate, months);
    const email = generateEmail(firstName, lastName, phone);

    // Skip if we couldn't calculate valid dates
    if (!startDate || !endDate) {
      return null;
    }

    return [
      firstName,
      lastName,
      email,
      phone,
      subscriptionType,
      startDate,
      endDate
    ].join(',');
  })
  .filter(record => record !== null) // Remove null records
  .join('\n');

// Write the converted CSV
fs.writeFileSync(outputFile, header + convertedRecords);

console.log('Conversion completed. Check converted_members.csv for the result.'); 