import { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

interface RecentExpense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

const categoryOptions = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Medical Supplies', value: 'medical_supplies' },
  { label: 'Utilities', value: 'utilities' },
  { label: 'Rent', value: 'rent' },
  { label: 'Staff Salary', value: 'staff_salary' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Other', value: 'other' },
];

export function MoneyAddExpense() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get('/expenses');
        if (response.success && response.data?.expenses) {
          setRecentExpenses(response.data.expenses);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch expenses';
        setError(message);
        console.error('Error fetching expenses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitLoading(true);

      const expenseData = {
        date,
        category,
        amount: parseFloat(amount),
        description: description || 'Expense',
      };

      const response = await apiClient.post('/expenses', expenseData);

      if (response.success) {
        setCategory('');
        setAmount('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);

        // Add the new expense to the local state for immediate display
        const newExpense = {
          id: response.data?.expense?.id || response.data?.id || '',
          date: expenseData.date,
          category: expenseData.category,
          amount: expenseData.amount,
          description: expenseData.description,
        };
        setRecentExpenses((prev) => [newExpense, ...prev]);

        alert('Expense saved successfully!');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save expense';
      console.error('Error saving expense:', err);
      alert(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatCategoryName = (category: string) => {
    return categoryOptions.find(opt => opt.value === category)?.label || category;
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-dark)]">Add Expense</h2>
        <p className="text-sm text-[var(--color-text-dark)]/60 mt-1">
          Record a new expense entry
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="expense-date"
                className="block text-sm font-medium text-[var(--color-text-dark)] mb-2"
              >
                Date
              </label>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded"
                required
              />
            </div>

            <div>
              <label
                htmlFor="expense-category"
                className="block text-sm font-medium text-[var(--color-text-dark)] mb-2"
              >
                Category
              </label>
              <select
                id="expense-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded"
                required
              >
                <option value="">Select a category</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="expense-amount"
                className="block text-sm font-medium text-[var(--color-text-dark)] mb-2"
              >
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-dark)]/60">
                  ₹
                </span>
                <input
                  id="expense-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 border border-[var(--color-border)] rounded font-mono text-tabular"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="expense-description"
                className="block text-sm font-medium text-[var(--color-text-dark)] mb-2"
              >
                Description
              </label>
              <textarea
                id="expense-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded resize-none"
                placeholder="Brief description of the expense..."
              />
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-3 bg-[var(--color-accent-teal)] text-white rounded font-medium hover:bg-[var(--color-accent-teal)]/90 transition-colors disabled:opacity-50"
            >
              {submitLoading ? 'Saving...' : 'Save expense'}
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-lg font-medium text-[var(--color-text-dark)] mb-4">
            Recent Expenses
          </h3>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage error={error} />
          ) : (
            <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="divide-y divide-[var(--color-border)]">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-4 hover:bg-[var(--color-hover)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-[var(--color-text-dark)] mb-1">
                          {formatCategoryName(expense.category)}
                        </div>
                        <div className="text-sm text-[var(--color-text-dark)]/70">
                          {expense.description}
                        </div>
                      </div>
                      <div className="font-mono text-tabular font-semibold text-[var(--color-text-dark)]">
                        ₹{expense.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--color-text-dark)]/50">
                      {new Date(expense.date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {recentExpenses.length === 0 && (
                <div className="py-8 text-center text-sm text-[var(--color-text-dark)]/60 italic">
                  No expenses recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
