import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: { label: string; value: string; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
          <Icon size={22} className={color} />
        </div>
      </div>
    </div>
  );
}

function SavingsWidget() {
  const { savingsGoals, savingsContributions } = useFinance();
  if (savingsGoals.length === 0) return null;

  const top = savingsGoals.slice(0, 4);
  const goalSaved = (id: string) => savingsContributions.filter(c => c.goalId === id).reduce((s, c) => s + c.amount, 0);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-700">Metas de ahorro</h2>
        <Link to="/ahorro" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
      </div>
      <ul className="space-y-3">
        {top.map(g => {
          const saved = goalSaved(g.id);
          const pct = g.targetAmount > 0 ? Math.min((saved / g.targetAmount) * 100, 100) : 0;
          return (
            <li key={g.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2 font-medium text-gray-700">
                  <span>{g.icon}</span>{g.name}
                </span>
                <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.color }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>{formatCurrency(saved)}</span>
                <span>{formatCurrency(g.targetAmount)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const { transactions, categories } = useFinance();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthTxs = useMemo(
    () => transactions.filter(t => isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })),
    [transactions, monthStart, monthEnd]
  );

  const monthIncome = useMemo(() => monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTxs]);
  const monthExpense = useMemo(() => monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTxs]);
  const totalBalance = useMemo(() => transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0), [transactions]);
  const savings = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? Math.round((savings / monthIncome) * 100) : 0;

  // Pie chart: expenses by category (current month)
  const expensePieData = useMemo(() => {
    const byCat: Record<string, number> = {};
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
    });
    return Object.entries(byCat).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return { name: cat?.name ?? 'Sin categoria', amount, color: cat?.color ?? '#6b7280' };
    }).sort((a, b) => b.amount - a.amount);
  }, [monthTxs, categories]);

  // Bar chart: last 6 months income vs expense
  const barData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const txs = transactions.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
      return {
        mes: format(d, 'MMM', { locale: es }),
        Ingresos: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        Gastos: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [transactions]);

  // Line chart: cumulative balance over time
  const lineData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let balance = 0;
    return sorted.map(t => {
      balance += t.type === 'income' ? t.amount : -t.amount;
      return { fecha: format(parseISO(t.date), 'dd/MM'), balance };
    });
  }, [transactions]);

  const recentTxs = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [transactions]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">
        Dashboard — {format(now, 'MMMM yyyy', { locale: es })}
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Balance total" value={formatCurrency(totalBalance)} icon={Wallet} color="text-gray-800" />
        <StatCard label="Ingresos del mes" value={formatCurrency(monthIncome)} icon={TrendingUp} color="text-emerald-600" />
        <StatCard label="Gastos del mes" value={formatCurrency(monthExpense)} icon={TrendingDown} color="text-red-500" />
        <StatCard
          label="Ahorro del mes"
          value={formatCurrency(savings)}
          icon={PiggyBank}
          color={savings >= 0 ? 'text-blue-600' : 'text-orange-500'}
          sub={monthIncome > 0 ? `${savingsRate}% de los ingresos` : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Gastos por categoria (este mes)</h2>
          {expensePieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">Sin gastos registrados este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expensePieData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {expensePieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Ingresos vs Gastos (ultimos 6 meses)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Legend />
              <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line chart */}
      {lineData.length > 1 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Evolucion del balance</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Savings goals widget */}
      <SavingsWidget />

      {/* Recent transactions */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Ultimas transacciones</h2>
        {recentTxs.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay transacciones aun.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentTxs.map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId);
              return (
                <li key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat?.icon ?? '📦'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tx.description || cat?.name}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
