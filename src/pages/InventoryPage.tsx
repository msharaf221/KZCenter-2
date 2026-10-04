import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { InventoryItem } from '../domain/models';
import { useCommandTask } from '../hooks/useCommandTask';
import { usePageResource } from '../hooks/usePageResource';
import { notify } from '../lib/notifications';
import { formatCurrency, formatDate } from '../lib/utils';
import { deleteCatalogRecord, saveInventoryItem } from '../services/commands/catalog';
import { loadInventoryCatalog } from '../services/queries/inventory';

const INITIAL_FORM = {
  name: '',
  type: 'handout' as 'book' | 'handout' | 'other',
  costPrice: 0,
  sellPrice: 0,
  stock: 0,
  courseId: '',
};

export default function InventoryPage() {
  const task = useCommandTask();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { settings } = useApp();
  const { user, can } = useAuth();
  const canWrite = can('inventory', 'create') || can('inventory', 'edit');
  const canDelete = can('inventory', 'delete');

  const { data: { items, courses }, loading, reload: load, error } = usePageResource(loadInventoryCatalog, {
    items: [], courses: [],
  });

  async function handleSave() {
    await task.run(async () => {
      await saveInventoryItem(user, form, editId || undefined);
      notify.success(editId ? 'تم التعديل بنجاح' : 'تمت الإضافة بنجاح');

      setShowModal(false);
      await load();
    });
  }

  async function handleDelete(id: string) {
    await task.run(async () => { await deleteCatalogRecord(user, 'inventory', id); notify.success('تم الحذف بنجاح'); await load(); });
  }

  function openEdit(item: InventoryItem) {
    setForm({
      name: item.name,
      type: item.type,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      stock: item.stock,
      courseId: item.courseId || '',
    });
    setEditId(item.id);
    setShowModal(true);
  }

  function openAdd() {
    setForm(INITIAL_FORM);
    setEditId(null);
    setShowModal(true);
  }

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.trim().toLowerCase()));

  // حد تنبيه نقص المخزون من الإعدادات (افتراضي 5)
  const lowThreshold = settings?.lowStockThreshold ?? 5;
  const lowStockItems = items.filter(i => !i.deleted && i.stock <= lowThreshold);

  if (error) return <PageReadError title="المخزون" onRetry={load} />;

  return (
    <Layout title="الملازم والمخزن">
      <div className="space-y-6">
        {lowStockItems.length > 0 && (
          <div className="glow-card relative bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-sm backdrop-blur-md overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <p className="font-bold text-rose-600 dark:text-rose-400">تنبيه نقص المخزون ({lowStockItems.length} عناصر حرجة)</p>
            </div>
            <p className="text-rose-500 dark:text-rose-300/90 text-xs leading-relaxed font-mono">
              {lowStockItems.slice(0, 6).map(i => `${i.name} (المتبقي: ${i.stock})`).join(' · ')}
              {lowStockItems.length > 6 ? ' …' : ''}
            </p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ابحث عن ملزمة أو كتاب..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-sm"
            />
          </div>
          {canWrite && (
            <button onClick={openAdd} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all w-full sm:w-auto">
              <Plus size={18} /> إضافة للمخزن
            </button>
          )}
        </div>

        <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#070b14]/80 border-b border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <th className="p-4">الاسم</th>
                  <th className="p-4">النوع</th>
                  <th className="p-4">الكورس (اختياري)</th>
                  <th className="p-4 text-center">التكلفة</th>
                  <th className="p-4 text-center">سعر البيع</th>
                  <th className="p-4 text-center">المخزون المتوفر</th>
                  <th className="p-4">تاريخ الإضافة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">جاري التحميل...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={8} className="p-12 text-center text-slate-400">لا توجد عناصر في المخزن</td></tr>
                ) : filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{item.name}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${item.type === 'book' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' : item.type === 'handout' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}`}>
                        {item.type === 'book' ? 'كتاب' : item.type === 'handout' ? 'ملزمة' : 'أخرى'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                      {item.courseId ? courses.find(c => c.id === item.courseId)?.name || 'غير معروف' : '—'}
                    </td>
                    <td className="p-4 text-center text-sm font-mono font-medium text-slate-500 dark:text-slate-400">{formatCurrency(item.costPrice, settings?.currency)}</td>
                    <td className="p-4 text-center text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(item.sellPrice, settings?.currency)}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg text-sm ${item.stock <= lowThreshold ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-500 dark:text-slate-400">{formatDate(item.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {canWrite && (
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-transparent hover:border-amber-500/20 transition-all">
                            <Edit2 size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'تعديل عنصر' : 'إضافة عنصر للمخزن'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم الملزمة/الكتاب *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">النوع</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as InventoryItem['type'] })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                <option value="handout" className="bg-slate-900 text-white">ملزمة</option>
                <option value="book" className="bg-slate-900 text-white">كتاب</option>
                <option value="other" className="bg-slate-900 text-white">أخرى</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">مرتبط بكورس (اختياري)</label>
              <select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                <option value="" className="bg-slate-900 text-white">غير مرتبط</option>
                {courses.map(c => <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">التكلفة (سعر الشراء)</label>
              <input type="number" min="0" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: +e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">سعر البيع للطالب</label>
              <input type="number" min="0" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: +e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الكمية المتوفرة حالياً</label>
              <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono" />
            </div>
          </div>
          <button onClick={handleSave} disabled={task.pending} className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all mt-2">
            حفظ
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId} title="حذف العنصر"
        message="هل أنت متأكد من حذف هذا العنصر؟ لن تتمكن من استعادته."
        onConfirm={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)} danger
      />
    </Layout>
  );
}
