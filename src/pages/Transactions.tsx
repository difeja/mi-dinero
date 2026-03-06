import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { type Transaction, type TransactionType } from '../types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

const EMPTY_FORM = {
  description: '',
  amount: '',
  categoryId: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  type: 'expense' as TransactionType,
};

export default function Transactions() {
  const { transactions, categories, addTransaction, updateTransaction, deleteTransaction } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCat, setFilterCat] = useState('');

  const filteredCats = categories.filter(c => c.type === form.type);

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  const displayed = useMemo(
    () => sorted.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCat && t.categoryId !== filterCat) return false;
      return true;
    }),
    [sorted, filterType, filterCat]
  );

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(tx: Transaction) {
    setForm({
      description: tx.description,
      amount: String(tx.amount),
      categoryId: tx.categoryId,
      date: tx.date.slice(0, 10),
      type: tx.type,
    });
    setEditingId(tx.id);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || !form.categoryId) return;
    const data = {
      description: form.description,
      amount,
      categoryId: form.categoryId,
      date: new Date(form.date + 'T12:00:00').toISOString(),
      type: form.type,
    };
    if (editingId) {
      updateTransaction({ ...data, id: editingId });
    } else {
      addTransaction(data);
    }
    handleClose();
  }

  function handleTypeChange(type: TransactionType) {
    setForm(f => ({ ...f, type, categoryId: '' }));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Transacciones</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} /> Nueva transaccion
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as typeof filterType)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
        >
          <option value="all">Todos los tipos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
        >
          <option value="">Todas las categorias</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {displayed.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-16">No hay transacciones.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {displayed.map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId);
              return (
                <li key={tx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <span className="text-2xl">{cat?.icon ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tx.description || cat?.name}</p>
                    <p className="text-xs text-gray-400">{cat?.name} · {format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}</p>
                  </div>
                  <span className={`text-base font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(tx)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingId ? 'Editar transaccion' : 'Nueva transaccion'}
              </h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {(['expense', 'income'] as TransactionType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      form.type === t
                        ? t === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'income' ? 'Ingreso' : 'Gasto'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar categoria</option>
                  {filteredCats.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descripcion opcional"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Check size={16} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
