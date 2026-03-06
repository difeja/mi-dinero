import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Category, type Transaction, type FinanceState, type SavingsGoal, type SavingsContribution } from '../types';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Alimentacion', type: 'expense', color: '#ef4444', icon: '🍔' },
  { id: 'cat-2', name: 'Transporte', type: 'expense', color: '#f97316', icon: '🚗' },
  { id: 'cat-3', name: 'Vivienda', type: 'expense', color: '#eab308', icon: '🏠' },
  { id: 'cat-4', name: 'Entretenimiento', type: 'expense', color: '#8b5cf6', icon: '🎮' },
  { id: 'cat-5', name: 'Salud', type: 'expense', color: '#ec4899', icon: '💊' },
  { id: 'cat-6', name: 'Educacion', type: 'expense', color: '#06b6d4', icon: '📚' },
  { id: 'cat-7', name: 'Ropa', type: 'expense', color: '#84cc16', icon: '👕' },
  { id: 'cat-8', name: 'Otros gastos', type: 'expense', color: '#6b7280', icon: '📦' },
  { id: 'cat-9', name: 'Salario', type: 'income', color: '#22c55e', icon: '💼' },
  { id: 'cat-10', name: 'Freelance', type: 'income', color: '#10b981', icon: '💻' },
  { id: 'cat-11', name: 'Inversiones', type: 'income', color: '#3b82f6', icon: '📈' },
  { id: 'cat-12', name: 'Otros ingresos', type: 'income', color: '#14b8a6', icon: '💰' },
];

const STORAGE_KEY = 'mi-dinero-data';

function loadState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // migrate old data without savings fields
      return {
        ...parsed,
        savingsGoals: parsed.savingsGoals ?? [],
        savingsContributions: parsed.savingsContributions ?? [],
      };
    }
  } catch {
    // ignore
  }
  return { categories: DEFAULT_CATEGORIES, transactions: [], savingsGoals: [], savingsContributions: [] };
}

function saveState(state: FinanceState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface FinanceContextValue {
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  savingsContributions: SavingsContribution[];
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (cat: Category) => void;
  deleteCategory: (id: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  updateSavingsGoal: (goal: SavingsGoal) => void;
  deleteSavingsGoal: (id: string) => void;
  addContribution: (c: Omit<SavingsContribution, 'id'>) => void;
  deleteContribution: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  function addCategory(cat: Omit<Category, 'id'>) {
    const newCat: Category = { ...cat, id: `cat-${Date.now()}` };
    setState(s => ({ ...s, categories: [...s.categories, newCat] }));
  }

  function updateCategory(cat: Category) {
    setState(s => ({ ...s, categories: s.categories.map(c => (c.id === cat.id ? cat : c)) }));
  }

  function deleteCategory(id: string) {
    setState(s => ({
      ...s,
      categories: s.categories.filter(c => c.id !== id),
      transactions: s.transactions.filter(t => t.categoryId !== id),
    }));
  }

  function addTransaction(tx: Omit<Transaction, 'id'>) {
    const newTx: Transaction = { ...tx, id: `tx-${Date.now()}` };
    setState(s => ({ ...s, transactions: [...s.transactions, newTx] }));
  }

  function updateTransaction(tx: Transaction) {
    setState(s => ({ ...s, transactions: s.transactions.map(t => (t.id === tx.id ? tx : t)) }));
  }

  function deleteTransaction(id: string) {
    setState(s => ({ ...s, transactions: s.transactions.filter(t => t.id !== id) }));
  }

  function addSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'createdAt'>) {
    const newGoal: SavingsGoal = { ...goal, id: `goal-${Date.now()}`, createdAt: new Date().toISOString() };
    setState(s => ({ ...s, savingsGoals: [...s.savingsGoals, newGoal] }));
  }

  function updateSavingsGoal(goal: SavingsGoal) {
    setState(s => ({ ...s, savingsGoals: s.savingsGoals.map(g => (g.id === goal.id ? goal : g)) }));
  }

  function deleteSavingsGoal(id: string) {
    setState(s => ({
      ...s,
      savingsGoals: s.savingsGoals.filter(g => g.id !== id),
      savingsContributions: s.savingsContributions.filter(c => c.goalId !== id),
    }));
  }

  function addContribution(c: Omit<SavingsContribution, 'id'>) {
    const newC: SavingsContribution = { ...c, id: `contrib-${Date.now()}` };
    setState(s => ({ ...s, savingsContributions: [...s.savingsContributions, newC] }));
  }

  function deleteContribution(id: string) {
    setState(s => ({ ...s, savingsContributions: s.savingsContributions.filter(c => c.id !== id) }));
  }

  return (
    <FinanceContext.Provider
      value={{
        categories: state.categories,
        transactions: state.transactions,
        savingsGoals: state.savingsGoals,
        savingsContributions: state.savingsContributions,
        addCategory, updateCategory, deleteCategory,
        addTransaction, updateTransaction, deleteTransaction,
        addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
        addContribution, deleteContribution,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
