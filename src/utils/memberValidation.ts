import { ImportMemberData, SubscriptionType } from '../types/member';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s-]{10,}$/;

interface ValidationError {
  row: number;
  errors: string[];
}

export const validateMemberData = (
  data: Record<string, string>[],
): { isValid: boolean; errors: ValidationError[] } => {
  const requiredFields = [
    'FirstName',
    'LastName',
    'Email',
    'Phone',
    'SubscriptionType',
    'SubscriptionStartDate',
    'SubscriptionEndDate',
  ];

  const validSubscriptionTypes: SubscriptionType[] = [
    'monthly',
    'quarterly',
    'semi-annual',
    'annual',
  ];

  const errors: ValidationError[] = [];

  data.forEach((row, index) => {
    const rowErrors: string[] = [];
    const rowNumber = index + 1;

    // Check for missing required fields
    requiredFields.forEach((field) => {
      if (!row[field] || row[field].trim() === '') {
        rowErrors.push(`Missing ${field}`);
      }
    });

    // Validate email format
    if (row.Email && !EMAIL_REGEX.test(row.Email)) {
      rowErrors.push('Invalid email format');
    }

    // Validate phone format
    if (row.Phone && !PHONE_REGEX.test(row.Phone)) {
      rowErrors.push('Invalid phone format (should be at least 10 digits)');
    }

    // Validate subscription type
    if (
      row.SubscriptionType &&
      !validSubscriptionTypes.includes(row.SubscriptionType.toLowerCase() as SubscriptionType)
    ) {
      rowErrors.push(
        `Invalid subscription type. Must be one of: ${validSubscriptionTypes.join(', ')}`
      );
    }

    // Validate start date format
    if (row.SubscriptionStartDate) {
      const startDate = new Date(row.SubscriptionStartDate);
      if (isNaN(startDate.getTime())) {
        rowErrors.push('Invalid start date format. Use YYYY-MM-DD');
      }
    }

    // Validate end date format
    if (row.SubscriptionEndDate) {
      const endDate = new Date(row.SubscriptionEndDate);
      if (isNaN(endDate.getTime())) {
        rowErrors.push('Invalid end date format. Use YYYY-MM-DD');
      } else if (endDate < new Date()) {
        rowErrors.push('Subscription end date cannot be in the past');
      }

      // Validate that end date is after start date
      if (row.SubscriptionStartDate) {
        const startDate = new Date(row.SubscriptionStartDate);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate <= startDate) {
          rowErrors.push('Subscription end date must be after start date');
        }
      }
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNumber,
        errors: rowErrors,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}; 