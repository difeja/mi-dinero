export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  date: string; // ISO string
  type: TransactionType;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  color: string;
  icon: string;
  deadline?: string; // ISO date string (yyyy-MM-dd)
  createdAt: string;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string; // ISO string
  note: string;
}

export interface FinanceState {
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  savingsContributions: SavingsContribution[];
}
