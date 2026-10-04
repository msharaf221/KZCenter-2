import { BookOpen, CheckSquare, ClipboardX, DollarSign, Download, Edit2, Eye, FileSpreadsheet, Filter, Plus, Search, Square, Trash2, Upload, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DataImportDialog from '../components/DataImportDialog';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import SheetImportDialog from '../components/SheetImportDialog';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import StudentFormDialog from '../features/students/StudentFormDialog';
import { useStudentEditor } from '../features/students/useStudentEditor';
import { useDebounce } from '../hooks';
import { useCommandTask } from '../hooks/useCommandTask';
import { usePageResource } from '../hooks/usePageResource';
import { notify, notifyNewStudent } from '../lib/notifications';
import { downloadCSV, formatCurrency, formatDate, toCSV } from '../lib/utils';
import { deleteStudents, importStudentCSV, saveStudent } from '../services/commands/students';
import { loadStudentsList } from '../services/queries/students';

const PAGE_SIZE = 24;

export default function StudentsPage() {
  const task = useCommandTask();
  const editor = useStudentEditor();
  const { setShowModal, editingStudent, form, initialPayments, initialPaymentMethod, startSessions, enrollPricing, openAdd, openEdit } = editor;
  const navigate = useNavigate();
  const { settings } = useApp();
  const { can, user } = useAuth();
  const canEdit = can('students', 'edit') || can('students', 'create'); // المدرس: عرض فقط
  const canDelete = can('students', 'delete');
  const showMoney = can('payments', 'view');
  const [page, setPage] = useState(1);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showSheetImport, setShowSheetImport] = useState(false);
  const [showDataImport, setShowDataImport] = useState(false);

  const query = useCallback(() => loadStudentsList({ page, pageSize: PAGE_SIZE, search: debouncedSearch, statusFilter, groupFilter, courseFilter, balanceFilter, attendanceFilter, role: user?.role, teacherId: user?.teacherId }), [page, debouncedSearch, statusFilter, groupFilter, courseFilter, balanceFilter, attendanceFilter, user?.role, user?.teacherId]);
  const { data: { groups, courses, attStatsById, students, total, allStudents }, loading, reload: loadStudents, error } = usePageResource(query, {
    groups: [], courses: [], attStatsById: {}, students: [], total: 0, allStudents: [],
  });

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, groupFilter, courseFilter, balanceFilter, attendanceFilter]);

  // Sync search query from the header's global search box (e.g. /students?q=...)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  async function handleSave() {
    await task.run(async () => {
      const result = await saveStudent(user, { id: editingStudent?.id, baselineGroupIds: editingStudent?.enrolledGroups, draft: form, initialPayments, initialPaymentMethod, startSessions, pricing: enrollPricing });
      if (editingStudent) notify.success('تم تحديث بيانات الطالب'); else { notifyNewStudent(form.name); notify.success('تم إضافة الطالب بنجاح'); }
      for (const warning of result.warnings) notify.error(warning);
      setShowModal(false);
      await loadStudents();
    });
  }

  async function handleDelete(id: string) {
    await task.run(async () => {
      const result = await deleteStudents(user, [id]);
      for (const warning of result.warnings) notify.error(warning);
      notify.success('تم حذف الطالب'); await loadStudents();
    });
  }

  /** رسالة تأكيد الحذف — بتنبّه لو الطالب عليه فلوس (الحذف بيسقط دينه من قائمة المديونيات) */
  function deleteMessage(ids: string[]): string {
    const targets = allStudents.filter(s => ids.includes(s.id));
    const debt = targets.reduce((sum, s) => sum + Math.max(0, (s.totalOwed || 0) - s.totalPaid), 0);
    const base = ids.length === 1
      ? 'هل أنت متأكد من حذف هذا الطالب؟ سيتم حذفه بشكل مؤقت.'
      : `هل أنت متأكد من حذف ${ids.length} طالب؟`;
    return debt > 0
      ? `${base}\n⚠️ تنبيه: عليه متبقي ${formatCurrency(debt, settings?.currency)} — الحذف هيسقط الدين من قائمة المديونيات. لو المقصود تسجيل انسحاب فقط، غيّر الحالة إلى «منتهي» بدل الحذف.`
      : base;
  }

  async function handleBulkDelete() {
    await task.run(async () => {
      const result = await deleteStudents(user, selectedIds);
      for (const warning of result.warnings) notify.error(warning);
      notify.success(`تم حذف ${result.deleted} طالب`);
      setSelectedIds([]); await loadStudents();
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  const allVisibleSelected = students.length > 0 && students.every(student => selectedIds.includes(student.id));
  const someVisibleSelected = students.some(student => selectedIds.includes(student.id));
  function toggleSelectAll() {
    const visibleIds = students.map(student => student.id);
    setSelectedIds(previous => visibleIds.every(id => previous.includes(id))
      ? previous.filter(id => !visibleIds.includes(id))
      : [...new Set([...previous, ...visibleIds])]);
  }


  function exportCSV() {
    const rows = students.map(s => {
      const st = attStatsById[s.id];
      const absent = st?.absent || 0;
      const total = st?.total || 0;
      return {
        ...s,
        absentCount: total === 0 ? '' : absent,
        attendanceRate: total === 0 ? '' : `${Math.round(((total - absent) / total) * 100)}%`,
      };
    });
    const csv = toCSV(rows as unknown as Record<string, unknown>[], [
      { key: 'name', label: 'الاسم' },
      { key: 'age', label: 'العمر' },
      { key: 'gender', label: 'النوع' },
      { key: 'phone', label: 'هاتف الطالب' },
      { key: 'parentPhone', label: 'هاتف ولي الأمر' },
      { key: 'status', label: 'الحالة' },
      { key: 'absentCount', label: 'عدد مرات الغياب' },
      { key: 'attendanceRate', label: 'نسبة الحضور' },
      { key: 'totalPaid', label: 'إجمالي المدفوع' },
      { key: 'totalOwed', label: 'المطلوب' },
      { key: 'notes', label: 'ملاحظات' },
      { key: 'createdAt', label: 'تاريخ التسجيل' },
    ]);
    downloadCSV(csv, 'students.csv');
    notify.success('تم تصدير بيانات الطلاب');
  }

  function downloadTemplate() {
    const csv = '"الاسم","العمر","النوع (male/female)","هاتف الطالب","هاتف ولي الأمر","الحالة (active/suspended/ended)","ملاحظات"\n"أحمد محمد","12","male","01012345678","01098765432","active",""\n';
    downloadCSV(csv, 'students_template.csv');
    notify.success('تم تحميل نموذج الاستيراد');
  }

  async function handleImportCSV(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await task.run(async () => {
      const result = await importStudentCSV(user, await file.text());
      notify.success(`تم استيراد ${result.imported} طالب${result.errors ? ` (${result.errors} خطأ)` : ''}`);
      await loadStudents();
    });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (error) return <PageReadError title="الطلاب" onRetry={loadStudents} />;

  return (
    <Layout title="إدارة الطلاب">
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 relative border border-slate-200/80 dark:border-white/10 shadow-sm">
          {/* Top specular glow */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-48 relative">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو هاتف ولي الأمر..."
                className="w-full pr-10 pl-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="pr-10 pl-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 cursor-pointer"
              >
                <option value="">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="suspended">متوقف</option>
                <option value="ended">منتهي</option>
              </select>
            </div>

            {/* Course Filter */}
            <div className="relative">
              <BookOpen size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <select
                value={courseFilter}
                onChange={e => { setCourseFilter(e.target.value); setGroupFilter(''); }}
                className="pr-10 pl-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 cursor-pointer max-w-[150px] truncate"
              >
                <option value="">كل الكورسات</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Group Filter */}
            <div className="relative">
              <Users size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <select
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                className="pr-10 pl-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 cursor-pointer max-w-[150px] truncate"
              >
                <option value="">كل المجموعات</option>
                {groups.filter(g => !courseFilter || g.courseId === courseFilter).map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Balance Filter */}
            {showMoney && (
              <div className="relative">
                <DollarSign size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <select
                  value={balanceFilter}
                  onChange={e => setBalanceFilter(e.target.value)}
                  className="pr-10 pl-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 cursor-pointer"
                >
                  <option value="">كل الأرصدة</option>
                  <option value="debt">عليهم مبالغ</option>
                  <option value="settled">مسددين</option>
                </select>
              </div>
            )}

            {/* Attendance Filter */}
            <div className="relative">
              <ClipboardX size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <select
                value={attendanceFilter}
                onChange={e => setAttendanceFilter(e.target.value)}
                className="pr-10 pl-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 cursor-pointer"
              >
                <option value="">كل الحضور</option>
                <option value="absent">غاب مرة+</option>
                <option value="repeat">غياب متكرر (3+)</option>
                <option value="none">بدون سجل حضور</option>
              </select>
            </div>

            {/* Bulk delete */}
            {canDelete && selectedIds.length > 0 && (
              <button
                onClick={() => setShowBulkDelete(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-sm font-bold hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                <Trash2 size={16} />
                حذف ({selectedIds.length})
              </button>
            )}

            <div role="group" aria-label="إجراءات الطلاب" className="flex min-w-0 max-w-full flex-wrap gap-2 mr-auto">
              {canEdit && (
                <>
                  <button onClick={downloadTemplate} className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer">
                    <Download size={16} className="text-cyan-500" />
                    <span className="hidden sm:inline">نموذج CSV</span>
                  </button>

                  <label className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer">
                    <Upload size={16} className="text-cyan-500" />
                    <span className="hidden sm:inline">استيراد CSV</span>
                    <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                  </label>

                  <button
                    onClick={() => setShowSheetImport(true)}
                    className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                    title="استيراد شيت المركز: مدرسين + مجموعات + طلاب"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-500" />
                    <span className="hidden sm:inline">استيراد شيت إكسيل</span>
                  </button>

                  <button
                    onClick={() => setShowDataImport(true)}
                    className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                    title="استيراد داتا (Excel/CSV/JSON): صف لكل طالب مع المدرس والمجموعة والمادة"
                  >
                    <Upload size={16} className="text-purple-500" />
                    <span className="hidden sm:inline">استيراد داتا</span>
                  </button>
                </>
              )}

              <button onClick={exportCSV} className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer">
                <Download size={16} className="text-slate-400" />
                <span className="hidden sm:inline">تصدير</span>
              </button>

              {canEdit && (
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500"
                >
                  <Plus size={16} />
                  <span>إضافة طالب</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/90 dark:bg-[#0b1122] border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="p-4 text-right">
                    <button type="button" role="checkbox" aria-label="اختيار كل الطلاب المعروضين" aria-checked={allVisibleSelected ? true : someVisibleSelected ? 'mixed' : false} disabled={loading || task.pending || !students.length} onClick={toggleSelectAll}>
                      {allVisibleSelected
                        ? <CheckSquare size={16} className="text-cyan-500" />
                        : <Square size={16} className="text-slate-400" />
                      }
                    </button>
                  </th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">الطالب</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">العمر</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">هاتف ولي الأمر</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">الحالة</th>
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">الغياب</th>
                  {showMoney && <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">المدفوع</th>}
                  {showMoney && <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">المتبقي</th>}
                  <th className="p-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">تاريخ التسجيل</th>
                  <th className="p-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr><td colSpan={showMoney ? 11 : 9} className="p-8 text-center">
                    <div className="animate-spin w-7 h-7 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                  </td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={showMoney ? 11 : 9} className="p-8 text-center text-slate-400">لا يوجد طلاب</td></tr>
                ) : students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-cyan-950/20 transition-colors">
                    <td className="p-4">
                      <button type="button" role="checkbox" aria-label={`اختيار ${student.name}`} aria-checked={selectedIds.includes(student.id)} disabled={task.pending} onClick={() => toggleSelect(student.id)}>
                        {selectedIds.includes(student.id)
                          ? <CheckSquare size={16} className="text-cyan-500" />
                          : <Square size={16} className="text-slate-400" />
                        }
                      </button>
                    </td>
                    <td className="p-4 text-sm font-mono text-slate-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 dark:from-cyan-500/20 dark:to-indigo-500/20 border border-indigo-500/25 dark:border-cyan-400/30 flex items-center justify-center text-base shadow-xs">
                            {student.gender === 'male' ? '👦' : '👧'}
                          </div>
                          <span className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#0c1324] ${student.status === 'active' ? 'bg-emerald-500' : student.status === 'suspended' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{student.name}</p>
                          {student.phone && <p className="text-xs text-slate-400 dark:text-slate-400 font-mono mt-0.5" dir="ltr">{student.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-700 dark:text-slate-300">{student.age} سنة</td>
                    <td className="p-4 text-sm font-mono text-slate-700 dark:text-slate-300" dir="ltr">{student.parentPhone}</td>
                    <td className="p-4"><Badge status={student.status} /></td>
                    <td className="p-4">
                      {(() => {
                        const st = attStatsById[student.id];
                        const absent = st?.absent || 0;
                        const total = st?.total || 0;
                        if (total === 0) {
                          return <span className="text-xs text-slate-400" title="لا يوجد سجل حضور لهذا الطالب">لا يوجد سجل</span>;
                        }
                        const rate = total > 0 ? Math.round(((total - absent) / total) * 100) : 100;
                        const tone = absent === 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : absent >= 3
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${tone}`}
                            title={`حضر ${total - absent} من ${total} مرة — نسبة الحضور ${rate}%`}
                          >
                            {absent === 0 ? <CheckSquare size={12} className="text-emerald-500" /> : <ClipboardX size={12} />}
                            <span>{absent === 0 ? 'ملتزم' : `${absent} غياب`}</span>
                            <span className="opacity-75 font-mono">({rate}%)</span>
                          </span>
                        );
                      })()}
                    </td>
                    {showMoney && (
                      <td className="p-4 text-sm font-black text-slate-900 dark:text-emerald-400 telemetry-number">
                        {formatCurrency(student.totalPaid, settings?.currency)}
                      </td>
                    )}
                    {showMoney && (
                      <td className="p-4 text-sm">
                        {(() => {
                          const remaining = (student.totalOwed || 0) - student.totalPaid;
                          if (remaining > 0) return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 telemetry-number">
                              {formatCurrency(remaining, settings?.currency)}
                            </span>
                          );
                          if (remaining < 0) return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 telemetry-number">
                              فائض {formatCurrency(Math.abs(remaining), settings?.currency)}
                            </span>
                          );
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              مسدد
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td className="p-4 text-sm font-mono text-slate-400">{formatDate(student.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => navigate(`/students/${student.id}`)} className="p-2 rounded-xl hover:bg-cyan-500/15 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors" title="عرض">
                          <Eye size={15} />
                        </button>
                        {canEdit && (
                          <>
                            <button onClick={() => openEdit(student)} className="p-2 rounded-xl hover:bg-amber-500/15 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors" title="تعديل">
                              <Edit2 size={15} />
                            </button>
                            {canDelete && (
                              <button onClick={() => setDeleteId(student.id)} className="p-2 rounded-xl hover:bg-rose-500/15 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors" title="حذف">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>

      {/* Add/Edit Modal */}
      <StudentFormDialog editor={editor} students={allStudents} groups={groups} courses={courses} onSave={handleSave} busy={task.pending} />

      {/* End Modals */}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="حذف الطالب"
        message={deleteId ? deleteMessage([deleteId]) : ''}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
        danger
      />

      {/* Sheet Import */}
      <SheetImportDialog
        open={showSheetImport}
        onClose={() => setShowSheetImport(false)}
        onDone={() => { loadStudents(); }}
      />

      {/* Data Import (Excel / CSV / JSON) */}
      <DataImportDialog
        open={showDataImport}
        onClose={() => setShowDataImport(false)}
        onDone={() => { loadStudents(); }}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        isOpen={showBulkDelete}
        title="حذف جماعي"
        message={deleteMessage(selectedIds)}
        onConfirm={() => { handleBulkDelete(); setShowBulkDelete(false); }}
        onCancel={() => setShowBulkDelete(false)}
        danger
      />
    </Layout>
  );
}
