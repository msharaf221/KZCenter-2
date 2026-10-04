import { Download, Filter, Search, Shield, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { notify } from '../lib/notifications';
import { AuditEntry, clearAuditLog, getAuditEntries } from '../lib/security';
import { downloadCSV, formatDate, formatDateTime, toCSV } from '../lib/utils';

const ACTION_LABELS: Record<string, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  export: 'تصدير',
  import: 'استيراد',
  backup: 'نسخ احتياطي',
  writeoff: 'تصفير مديونيات',
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    void loadLog();
    const handler = () => { void loadLog(); };
    window.addEventListener('audit_log_updated', handler);
    return () => window.removeEventListener('audit_log_updated', handler);
  }, []);

  useEffect(() => {
    let filtered = entries;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e =>
        e.username.toLowerCase().includes(q) ||
        e.entity.toLowerCase().includes(q) ||
        (e.details || '').toLowerCase().includes(q)
      );
    }
    if (actionFilter) {
      filtered = filtered.filter(e => e.action === actionFilter);
    }
    setFilteredEntries(filtered);
  }, [entries, search, actionFilter]);

  async function loadLog() {
    // السجل دلوقتي في IndexedDB (مركزي + بيتنسخ + بيتزامن) مش في localStorage
    const rows = await getAuditEntries();
    setEntries(rows);
  }

  async function handleClear() {
    await clearAuditLog({ userId: user?.id || 'unknown', username: user?.username || 'غير معروف' });
    setShowClearConfirm(false);
    await loadLog();
    notify.success('تم مسح سجل المراجعة');
  }

  function handleExport() {
    const csv = toCSV(entries as unknown as Record<string, unknown>[], [
      { key: 'timestamp', label: 'التاريخ والوقت' },
      { key: 'username', label: 'المستخدم' },
      { key: 'action', label: 'الإجراء' },
      { key: 'entity', label: 'الكيان' },
      { key: 'entityId', label: 'معرف الكيان' },
      { key: 'details', label: 'التفاصيل' },
    ]);
    downloadCSV(csv, `audit_log_${formatDate(new Date().toISOString(), 'YYYY-MM-DD')}.csv`);
    notify.success('تم تصدير السجل');
  }

  return (
    <Layout title="سجل المراجعة">
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-4 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-48 relative">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث بالمستخدم أو الكيان أو التفاصيل..."
                className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            <div className="relative">
              <Filter size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="" className="bg-slate-900 text-white">كل الإجراءات</option>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key} className="bg-slate-900 text-white">{label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mr-auto">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-sm"
              >
                <Download size={16} className="text-cyan-500" />
                <span className="hidden sm:inline">تصدير CSV</span>
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-500/20 transition-all shadow-sm"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">مسح الكل</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">إجمالي السجلات</p>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-cyan-300 tracking-tight">{entries.length}</p>
          </div>
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-indigo-500/20 p-4 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">تسجيلات دخول</p>
            <p className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 tracking-tight">
              {entries.filter(e => e.action === 'login').length}
            </p>
          </div>
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-4 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">عمليات إنشاء</p>
            <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {entries.filter(e => e.action === 'create').length}
            </p>
          </div>
          <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-rose-500/20 p-4 shadow-sm overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-400/50 to-transparent pointer-events-none" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">عمليات حذف</p>
            <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
              {entries.filter(e => e.action === 'delete').length}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 dark:bg-[#070b14]/80 border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">التاريخ والوقت</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">المستخدم</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">الإجراء</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">الكيان</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <Shield size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-400">لا توجد سجلات</p>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDateTime(entry.timestamp)}
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{entry.username}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${entry.action === 'create' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : entry.action === 'delete' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : entry.action === 'login' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'}`}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{entry.entity}</td>
                      <td className="p-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{entry.details || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="مسح سجل المراجعة"
        message="هل أنت متأكد من مسح جميع السجلات؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
        danger
      />
    </Layout>
  );
}
