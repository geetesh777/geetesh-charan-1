export interface Member {
  id: string;
  name: string;
  avatar: string; // URL or Initials
}

export enum SplitType {
  EQUAL = 'EQUAL',
  PERCENTAGE = 'PERCENTAGE',
  SHARES = 'SHARES',
  EXACT = 'EXACT'
}

export enum ExpenseCategory {
  FOOD = 'Food',
  TRANSPORT = 'Transport',
  ACCOMMODATION = 'Accommodation',
  ENTERTAINMENT = 'Entertainment',
  UTILITIES = 'Utilities',
  OTHER = 'Other'
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  payerId: string;
  date: string;
  category: ExpenseCategory;
  splitType: SplitType;
  // Map of memberId to their share (value depends on splitType: amount, %, or shares)
  splits: Record<string, number>; 
  isRecurring: boolean;
}

export interface Group {
  id: string;
  name: string;
  type: 'TRIP' | 'HOME' | 'PROJECT';
  memberIds: string[];
  currency: string;
}

export interface Settlement {
  from: string; // Member ID
  to: string;   // Member ID
  amount: number;
}

export interface Balance {
  memberId: string;
  amount: number; // Positive = Owed money, Negative = Owes money
}

export interface AIParseResult {
  description: string;
  amount: number;
  payerName: string | null;
  category: string;
  involvedNames: string[];
}
