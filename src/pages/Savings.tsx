import { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Plus, Pencil, Trash2, X, Check, PiggyBank, Target, TrendingUp, Calendar } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { type SavingsGoal } from '../types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

function formatCompact(amount: number) {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount}`;
}

function BottomSheet({ open, onClose, title, sub, children }: { open: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-start justify-between px-5 pt-2 pb-3 sm:pt-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{title}</h2>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-lg ml-2"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444',
  '#10b981', '#f97316', '#06b6d4', '#ec4899', '#84cc16',
];

const ICONS = ['🎯', '🏠', '✈️', '🚗', '📱', '💍', '🎓', '🏖️', '💻', '🎸', '🐾', '🍕', '💪', '🌱', '🏋️'];

const EMPTY_GOAL = { name: '', targetAmount: '', color: '#3b82f6', icon: '🎯', deadline: '' };

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function Savings() {
  const { savingsGoals, savingsContributions, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, addContribution, deleteContribution } = useFinance();

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showContribForm, setShowContribForm] = useState(false);
  const [contribForm, setContribForm] = useState({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '' });

  function goalSaved(goalId: string) {
    return savingsContributions.filter(c => c.goalId === goalId).reduce((s, c) => s + c.amount, 0);
  }

  // Summary totals
  const totalTarget = useMemo(() => savingsGoals.reduce((s, g) => s + g.targetAmount, 0), [savingsGoals]);
  const totalSaved = useMemo(() => savingsContributions.reduce((s, c) => s + c.amount, 0), [savingsContributions]);
  const completedGoals = useMemo(() => savingsGoals.filter(g => goalSaved(g.id) >= g.targetAmount).length, [savingsGoals, savingsContributions]);

  // Radial chart data
  const radialData = useMemo(() =>
    savingsGoals.map(g => {
      const saved = goalSaved(g.id);
      const pct = g.targetAmount > 0 ? Math.min(Math.round((saved / g.targetAmount) * 100), 100) : 0;
      return { name: g.name, value: pct, fill: g.color };
    }),
    [savingsGoals, savingsContributions]
  );

  // Area chart: cumulative savings over time
  const areaData = useMemo(() => {
    const sorted = [...savingsContributions].sort((a, b) => a.date.localeCompare(b.date));
    let total = 0;
    return sorted.map(c => {
      total += c.amount;
      const goal = savingsGoals.find(g => g.id === c.goalId);
      return {
        fecha: format(parseISO(c.date), 'dd/MM', { locale: es }),
        total,
        meta: goal?.name ?? '',
      };
    });
  }, [savingsContributions, savingsGoals]);

  const selectedGoal = savingsGoals.find(g => g.id === selectedGoalId) ?? null;
  const selectedContribs = useMemo(
    () => selectedGoalId
      ? [...savingsContributions.filter(c => c.goalId === selectedGoalId)].sort((a, b) => b.date.localeCompare(a.date))
      : [],
    [savingsContributions, selectedGoalId]
  );

  function openAddGoal() {
    setGoalForm(EMPTY_GOAL);
    setEditingGoalId(null);
    setShowGoalForm(true);
  }

  function openEditGoal(g: SavingsGoal) {
    setGoalForm({ name: g.name, targetAmount: String(g.targetAmount), color: g.color, icon: g.icon, deadline: g.deadline ?? '' });
    setEditingGoalId(g.id);
    setShowGoalForm(true);
  }

  function handleGoalSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = parseFloat(goalForm.targetAmount);
    if (!goalForm.name.trim() || !amount) return;
    const data = { name: goalForm.name, targetAmount: amount, color: goalForm.color, icon: goalForm.icon, deadline: goalForm.deadline || undefined };
    if (editingGoalId) {
      updateSavingsGoal({ ...data, id: editingGoalId, createdAt: savingsGoals.find(g => g.id === editingGoalId)!.createdAt });
    } else {
      addSavingsGoal(data);
    }
    setShowGoalForm(false);
    setEditingGoalId(null);
  }

  function handleDeleteGoal(id: string) {
    const count = savingsContributions.filter(c => c.goalId === id).length;
    if (count > 0 && !confirm(`Esta meta tiene ${count} aportes que tambien se eliminaran. ¿Continuar?`)) return;
    if (selectedGoalId === id) setSelectedGoalId(null);
    deleteSavingsGoal(id);
  }

  function handleContribSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedGoalId || !contribForm.amount) return;
    addContribution({
      goalId: selectedGoalId,
      amount: parseFloat(contribForm.amount),
      date: new Date(contribForm.date + 'T12:00:00').toISOString(),
      note: contribForm.note,
    });
    setContribForm({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '' });
    setShowContribForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Ahorro</h1>
        <button
          onClick={openAddGoal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Nueva meta
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-blue-500" />
            <p className="text-xs text-gray-500">Total metas</p>
          </div>
          <p className="text-xl font-bold text-gray-800">{savingsGoals.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank size={16} className="text-emerald-500" />
            <p className="text-xs text-gray-500">Total ahorrado</p>
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatCompact(totalSaved)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-violet-500" />
            <p className="text-xs text-gray-500">Objetivo total</p>
          </div>
          <p className="text-xl font-bold text-gray-800">{formatCompact(totalTarget)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Check size={16} className="text-amber-500" />
            <p className="text-xs text-gray-500">Metas cumplidas</p>
          </div>
          <p className="text-xl font-bold text-amber-600">{completedGoals} / {savingsGoals.length}</p>
        </div>
      </div>

      {savingsGoals.length === 0 ? (
        <div className="bg-white rounded-xl p-16 shadow-sm border border-gray-100 text-center">
          <PiggyBank size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tienes metas de ahorro</p>
          <p className="text-gray-400 text-sm mt-1">Crea tu primera meta y empieza a ahorrar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Goals list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Mis metas</h2>
            {savingsGoals.map(g => {
              const saved = goalSaved(g.id);
              const pct = g.targetAmount > 0 ? Math.min((saved / g.targetAmount) * 100, 100) : 0;
              const remaining = g.targetAmount - saved;
              const daysLeft = g.deadline ? differenceInDays(parseISO(g.deadline), new Date()) : null;
              const done = saved >= g.targetAmount;
              const isSelected = selectedGoalId === g.id;

              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGoalId(isSelected ? null : g.id)}
                  className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all ${isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: g.color + '20' }}>
                      {g.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-gray-800 text-sm truncate">{g.name}</span>
                        {done && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium ml-2 shrink-0">Completada</span>}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{formatCurrency(saved)} de {formatCurrency(g.targetAmount)}</span>
                        <span className="font-medium" style={{ color: g.color }}>{pct.toFixed(0)}%</span>
                      </div>
                      <ProgressBar pct={pct} color={g.color} />
                      <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                        <span>{done ? 'Meta alcanzada!' : `Faltan ${formatCurrency(remaining)}`}</span>
                        {daysLeft !== null && (
                          <span className={`flex items-center gap-1 ${daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-amber-500' : ''}`}>
                            <Calendar size={11} />
                            {daysLeft < 0 ? `Vencio hace ${Math.abs(daysLeft)}d` : `${daysLeft}d restantes`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEditGoal(g); }} className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteGoal(g.id); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right panel: radial chart or goal detail */}
          <div className="space-y-4">
            {selectedGoal ? (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedGoal.icon}</span>
                    <h3 className="font-semibold text-gray-800">{selectedGoal.name}</h3>
                  </div>
                  <button
                    onClick={() => { setShowContribForm(true); setContribForm({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '' }); }}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={13} /> Aporte
                  </button>
                </div>

                {/* Area chart for this goal */}
                {selectedContribs.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Progreso de aportes</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart
                        data={(() => {
                          const sorted = [...selectedContribs].sort((a, b) => a.date.localeCompare(b.date));
                          let acc = 0;
                          return sorted.map(c => { acc += c.amount; return { fecha: format(parseISO(c.date), 'dd/MM'), acumulado: acc }; });
                        })()}
                        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={selectedGoal.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={selectedGoal.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => formatCurrency(v as number)} />
                        <Area type="monotone" dataKey="acumulado" stroke={selectedGoal.color} fill="url(#areaGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">Aun no hay aportes a esta meta.</p>
                )}

                {/* Contributions list */}
                <p className="text-xs text-gray-500 font-medium mb-2">Historial de aportes</p>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {selectedContribs.map(c => (
                    <li key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 text-sm">
                      <div>
                        <span className="font-medium text-emerald-600">+{formatCurrency(c.amount)}</span>
                        {c.note && <span className="text-gray-400 text-xs ml-2">{c.note}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{format(parseISO(c.date), 'dd MMM yyyy', { locale: es })}</span>
                        <button onClick={() => deleteContribution(c.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                  {selectedContribs.length === 0 && <li className="text-gray-400 text-xs text-center py-2">Sin aportes aun</li>}
                </ul>
              </div>
            ) : (
              /* Radial overview chart */
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Progreso general</h3>
                <p className="text-xs text-gray-400 mb-3">Haz clic en una meta para ver el detalle</p>
                <ResponsiveContainer width="100%" height={250}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={6} label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <ul className="mt-2 space-y-1">
                  {savingsGoals.map(g => (
                    <li key={g.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="truncate">{g.icon} {g.name}</span>
                      <span className="ml-auto font-medium" style={{ color: g.color }}>
                        {Math.min(Math.round((goalSaved(g.id) / g.targetAmount) * 100), 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Global area chart */}
            {areaData.length > 1 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">Ahorro acumulado total</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={areaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#totalGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goal form modal */}
      <BottomSheet open={showGoalForm} onClose={() => setShowGoalForm(false)} title={editingGoalId ? 'Editar meta' : 'Nueva meta de ahorro'}>
        <form onSubmit={handleGoalSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la meta *</label>
                <input
                  type="text" required value={goalForm.name}
                  onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Viaje a Europa"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto objetivo *</label>
                <input
                  type="number" min="0" step="any" required value={goalForm.targetAmount}
                  onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha limite (opcional)</label>
                <input
                  type="date" value={goalForm.deadline}
                  onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icono</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setGoalForm(f => ({ ...f, icon }))}
                      className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${goalForm.icon === icon ? 'ring-2 ring-blue-500 bg-blue-50 scale-110' : 'hover:bg-gray-100'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setGoalForm(f => ({ ...f, color }))}
                      className={`w-7 h-7 rounded-full transition-all ${goalForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: goalForm.color + '25' }}>
                  {goalForm.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{goalForm.name || 'Vista previa'}</p>
                  {goalForm.targetAmount && <p className="text-xs text-gray-400">{formatCurrency(parseFloat(goalForm.targetAmount) || 0)}</p>}
                </div>
              </div>
          <div className="flex gap-3 pb-2">
            <button type="button" onClick={() => setShowGoalForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium">Cancelar</button>
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium">
              <Check size={16} /> Guardar
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Contribution modal */}
      <BottomSheet
        open={showContribForm && !!selectedGoal}
        onClose={() => setShowContribForm(false)}
        title="Registrar aporte"
        sub={selectedGoal ? `${selectedGoal.icon} ${selectedGoal.name}` : undefined}
      >
        <form onSubmit={handleContribSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
            <input
              type="number" inputMode="decimal" min="0" step="any" required value={contribForm.amount}
              onChange={e => setContribForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
            <input
              type="date" required value={contribForm.date}
              onChange={e => setContribForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
            <input
              type="text" value={contribForm.note}
              onChange={e => setContribForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Ej: Quincena de marzo"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pb-2">
            <button type="button" onClick={() => setShowContribForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium">Cancelar</button>
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium">
              <Check size={16} /> Guardar
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
