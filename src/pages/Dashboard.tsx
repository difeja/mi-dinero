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

function formatCompact(amount: number) {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount}`;
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: { label: string; value: string; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
          <p className={`text-lg sm:text-xl font-bold ${color} truncate`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ml-2 shrink-0`} style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
          <Icon size={18} className={color} />
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
    <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
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
                <span className="flex items-center gap-2 font-medium text-gray-700 truncate">
                  <span>{g.icon}</span>{g.name}
                </span>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.color }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>{formatCompact(saved)}</span>
                <span>{formatCompact(g.targetAmount)}</span>
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
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 capitalize">
        {format(now, 'MMMM yyyy', { locale: es })}
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Balance total" value={formatCompact(totalBalance)} icon={Wallet} color="text-gray-800" />
        <StatCard label="Ingresos" value={formatCompact(monthIncome)} icon={TrendingUp} color="text-emerald-600" />
        <StatCard label="Gastos" value={formatCompact(monthExpense)} icon={TrendingDown} color="text-red-500" />
        <StatCard
          label="Ahorro"
          value={formatCompact(savings)}
          icon={PiggyBank}
          color={savings >= 0 ? 'text-blue-600' : 'text-orange-500'}
          sub={monthIncome > 0 ? `${savingsRate}% de ingresos` : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Pie chart */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm sm:text-base font-semibold text-gray-700 mb-3">Gastos por categoria</h2>
          {expensePieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">Sin gastos este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expensePieData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={30}>
                  {expensePieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm sm:text-base font-semibold text-gray-700 mb-3">Ingresos vs Gastos</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Ingresos" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line chart */}
      {lineData.length > 1 && (
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm sm:text-base font-semibold text-gray-700 mb-3">Evolucion del balance</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <SavingsWidget />

      {/* Recent transactions */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm sm:text-base font-semibold text-gray-700 mb-3">Ultimas transacciones</h2>
        {recentTxs.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay transacciones aun.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentTxs.map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId);
              return (
                <li key={tx.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{cat?.icon ?? '📦'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{tx.description || cat?.name}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(tx.date), 'dd MMM', { locale: es })}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCompact(tx.amount)}
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
