import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { type Category, type TransactionType } from '../types';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#84cc16', '#6b7280',
];

const ICONS = ['🍔', '🚗', '🏠', '🎮', '💊', '📚', '👕', '📦', '💼', '💻', '📈', '💰', '✈️', '🎵', '🏋️', '🍕', '☕', '🎁', '🐾', '⚡'];

const EMPTY_FORM = { name: '', type: 'expense' as TransactionType, color: '#ef4444', icon: '📦' };

function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 sm:pt-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-lg"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory, transactions } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState<TransactionType>('expense');

  const visible = categories.filter(c => c.type === tab);

  function txCount(catId: string) {
    return transactions.filter(t => t.categoryId === catId).length;
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, type: tab });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setForm({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon });
    setEditingId(cat.id);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditingId(null);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      updateCategory({ ...form, id: editingId });
    } else {
      addCategory(form);
    }
    handleClose();
  }

  function handleDelete(cat: Category) {
    const count = txCount(cat.id);
    if (count > 0 && !confirm(`Esta categoria tiene ${count} transacciones que tambien seran eliminadas. ¿Continuar?`)) return;
    deleteCategory(cat.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Categorias</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-xl text-sm font-medium active:bg-emerald-700 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nueva categoria</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['expense', 'income'] as TransactionType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'
            }`}
          >
            {t === 'expense' ? '💸 Gastos' : '💰 Ingresos'}
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
              {categories.filter(c => c.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map(cat => (
          <div
            key={cat.id}
            className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: cat.color + '20' }}
            >
              {cat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate text-sm">{cat.name}</p>
              <p className="text-xs text-gray-400">{txCount(cat.id)} transacciones</p>
            </div>
            <div className="flex gap-0.5 shrink-0">
              <button onClick={() => openEdit(cat)} className="p-2 text-gray-400 active:text-blue-500 rounded-lg transition-colors">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(cat)} className="p-2 text-gray-400 active:text-red-500 rounded-lg transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <p className="col-span-full text-gray-400 text-sm text-center py-12">
            No hay categorias de {tab === 'expense' ? 'gastos' : 'ingresos'}.
          </p>
        )}
      </div>

      <BottomSheet open={showForm} onClose={handleClose} title={editingId ? 'Editar categoria' : 'Nueva categoria'}>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Type */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(['expense', 'income'] as TransactionType[]).map(t => (
              <button
                key={t} type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  form.type === t
                    ? t === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                    : 'text-gray-500'
                }`}
              >
                {t === 'income' ? 'Ingreso' : 'Gasto'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre de la categoria"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icono</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button
                  key={icon} type="button"
                  onClick={() => setForm(f => ({ ...f, icon }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    form.icon === icon ? 'ring-2 ring-emerald-500 bg-emerald-50 scale-110' : 'bg-gray-50'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map(color => (
                <button
                  key={color} type="button"
                  onClick={() => setForm(f => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-full transition-all ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: form.color + '25' }}>
              {form.icon}
            </div>
            <span className="text-sm font-medium text-gray-700 flex-1">{form.name || 'Vista previa'}</span>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: form.color }} />
          </div>

          <div className="flex gap-3 pb-2">
            <button type="button" onClick={handleClose} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-medium">
              <Check size={16} /> Guardar
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
