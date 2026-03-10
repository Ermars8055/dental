import { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

export function MoneyToday() {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [byMethod, setByMethod] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both requests in parallel
        const [incomeResponse, expensesResponse] = await Promise.all([
          apiClient.get('/payments/summary/daily'),
          apiClient.get('/expenses/summary/daily'),
        ]);

        // Process income data
        if (incomeResponse.success && incomeResponse.data) {
          setTotalIncome(parseFloat(incomeResponse.data.total || incomeResponse.data.totalCollected || 0));
          // by_method is an array [{payment_method, total, count}]
          const methodMap: Record<string, number> = {};
          (incomeResponse.data.by_method || []).forEach((r: any) => {
            methodMap[r.payment_method || 'cash'] = parseFloat(r.total);
          });
          setByMethod(methodMap);
        } else {
          throw new Error(incomeResponse.message || 'Failed to fetch income data');
        }

        // Process expenses data
        if (expensesResponse.success && expensesResponse.data) {
          setTotalExpenses(parseFloat(expensesResponse.data.total || expensesResponse.data.totalExpenses || 0));
        } else {
          throw new Error(expensesResponse.message || 'Failed to fetch expenses data');
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
    // Refetch every 60 seconds to keep data fresh without overloading backend
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-[var(--color-text-dark)] mb-6">Today's Money</h2>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-[var(--color-text-dark)] mb-6">Today's Money</h2>
        <ErrorMessage error={error} />
      </div>
    );
  }

  const netToday = totalIncome - totalExpenses;
  const paymentMethods = Object.entries(byMethod).map(([method, amount]) => ({
    method: method.charAt(0).toUpperCase() + method.slice(1),
    amount: amount as number,
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-dark)]">Today's Money</h2>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="text-sm text-[var(--color-text-dark)]/60 mb-2">Collected Today</div>
          <div className="text-3xl font-semibold font-mono text-tabular text-[var(--color-accent-teal)]">
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="text-sm text-[var(--color-text-dark)]/60 mb-2">Expenses Today</div>
          <div className="text-3xl font-semibold font-mono text-tabular text-[var(--color-text-dark)]">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <div className="text-sm text-[var(--color-text-dark)]/60 mb-2">Net Today</div>
          <div
            className={`text-3xl font-semibold font-mono text-tabular ${
              netToday >= 0 ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-red-critical)]'
            }`}
          >
            ₹{netToday.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {paymentMethods.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-[var(--color-text-dark)] mb-4">Income by Payment Method</h3>
          <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--color-paper-highlight)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-dark)]">
                    Payment Method
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-dark)]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {paymentMethods.map((entry) => (
                  <tr key={entry.method} className="hover:bg-[var(--color-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm text-[var(--color-text-dark)]">{entry.method}</td>
                    <td className="px-4 py-3 text-sm font-mono text-tabular font-medium text-[var(--color-text-dark)] text-right">
                      ₹{entry.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalIncome === 0 && totalExpenses === 0 && (
        <div className="py-12 text-center text-sm text-[var(--color-text-dark)]/60 italic">
          No financial transactions recorded today yet.
        </div>
      )}
    </div>
  );
}
