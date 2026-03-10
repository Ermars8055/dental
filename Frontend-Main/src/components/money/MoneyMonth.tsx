import { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

// Generate month options dynamically: current month + last 11 months
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ label, value: `${year}-${month}` });
  }
  return options;
};

const monthOptions = generateMonthOptions();

export function MoneyMonth() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [paymentByMethod, setPaymentByMethod] = useState<Record<string, number>>({});
  const [expenseByCategory, setExpenseByCategory] = useState<Record<string, number>>({});
  const [paymentCount, setPaymentCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const paymentResponse = await apiClient.get(`/payments/summary/monthly?month=${selectedMonth}`);
        if (paymentResponse.success && paymentResponse.data) {
          const total = parseFloat(paymentResponse.data.total || paymentResponse.data.totalCollected || 0);
          setTotalIncome(total);
          // by_day is [{day, total, count}] — sum it up; byMethod not available from monthly endpoint
          setPaymentByMethod({});
          setPaymentCount(paymentResponse.data.by_day?.length || 0);
        }

        const expenseResponse = await apiClient.get(`/expenses/summary/monthly?month=${selectedMonth}`);
        if (expenseResponse.success && expenseResponse.data) {
          const total = parseFloat(expenseResponse.data.total || expenseResponse.data.totalExpenses || 0);
          setTotalExpenses(total);
          // by_category is [{category, total, count}]
          const catMap: Record<string, number> = {};
          (expenseResponse.data.by_category || []).forEach((r: any) => {
            catMap[r.category] = parseFloat(r.total);
          });
          setExpenseByCategory(catMap);
          setExpenseCount(expenseResponse.data.by_category?.reduce((s: number, r: any) => s + parseInt(r.count), 0) || 0);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch data';
        setError(message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-[var(--color-text-dark)] mb-6">
          Monthly Summary
        </h2>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-[var(--color-text-dark)] mb-6">
          Monthly Summary
        </h2>
        <ErrorMessage error={error} />
      </div>
    );
  }

  const netMonth = totalIncome - totalExpenses;

  const incomePercentage = totalIncome + totalExpenses > 0
    ? (totalIncome / (totalIncome + totalExpenses)) * 100
    : 0;
  const expensePercentage = totalIncome + totalExpenses > 0
    ? (totalExpenses / (totalIncome + totalExpenses)) * 100
    : 0;

  // Convert objects to arrays for rendering
  const paymentMethods = Object.entries(paymentByMethod).map(([method, amount]) => ({
    method: method.charAt(0).toUpperCase() + method.slice(1),
    amount: amount as number,
  }));

  const expenseCategories = Object.entries(expenseByCategory).map(([category, amount]) => ({
    category: category.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    amount: amount as number,
  }));


  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[var(--color-text-dark)]">
          Monthly Summary
        </h2>
        <div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded text-sm"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="text-sm text-[var(--color-text-dark)]/60 mb-2">Total Income</div>
          <div className="text-2xl font-semibold font-mono text-tabular text-[var(--color-accent-teal)]">
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="text-sm text-[var(--color-text-dark)]/60 mb-2">Total Expenses</div>
          <div className="text-2xl font-semibold font-mono text-tabular text-[var(--color-text-dark)]">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="text-sm text-[var(--color-text-dark)]/60 mb-2">Net</div>
          <div
            className={`text-2xl font-semibold font-mono text-tabular ${
              netMonth >= 0 ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-red-critical)]'
            }`}
          >
            ₹{netMonth.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="text-sm text-[var(--color-text-dark)]/60 mb-2">Transactions</div>
          <div className="text-2xl font-semibold font-mono text-tabular text-[var(--color-text-dark)]">
            {paymentCount + expenseCount}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 mb-8">
        <h3 className="text-sm font-medium text-[var(--color-text-dark)] mb-4">
          Income vs Expenses
        </h3>
        <div className="flex h-12 rounded overflow-hidden">
          <div
            className="bg-[var(--color-accent-teal)] flex items-center justify-center text-white text-sm font-medium"
            style={{ width: incomePercentage + '%' }}
          >
            {incomePercentage.toFixed(0)}%
          </div>
          <div
            className="bg-[#C4A57B] flex items-center justify-center text-white text-sm font-medium"
            style={{ width: expensePercentage + '%' }}
          >
            {expensePercentage.toFixed(0)}%
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--color-text-dark)]/60">
          <div>Income</div>
          <div>Expenses</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-[var(--color-text-dark)] mb-4">
            Income by Payment Method
          </h3>
          <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--color-paper-highlight)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                    Method
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-dark)]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {paymentMethods.map((item) => (
                  <tr key={item.method} className="hover:bg-[var(--color-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm text-[var(--color-text-dark)]">
                      {item.method}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-tabular text-right font-medium text-[var(--color-text-dark)]">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paymentMethods.length === 0 && (
              <div className="py-8 text-center text-sm text-[var(--color-text-dark)]/60 italic">
                No payment data available.
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-[var(--color-text-dark)] mb-4">
            Expenses by Category
          </h3>
          <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--color-paper-highlight)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-dark)]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {expenseCategories.map((item) => (
                  <tr key={item.category} className="hover:bg-[var(--color-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm text-[var(--color-text-dark)]">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-tabular text-right font-medium text-[var(--color-text-dark)]">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenseCategories.length === 0 && (
              <div className="py-8 text-center text-sm text-[var(--color-text-dark)]/60 italic">
                No expense data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
