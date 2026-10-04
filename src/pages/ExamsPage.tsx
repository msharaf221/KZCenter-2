import dayjs from 'dayjs';
import { ClipboardList, Edit2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import ResourceError from '../components/ui/ResourceError';
import { useAuth } from '../contexts/AuthContext';
import { readByIndex } from '../data/readers';
import type { Exam, Student } from '../domain/models';
import { useCommandTask } from '../hooks/useCommandTask';
import { usePageResource } from '../hooks/usePageResource';
import { useResourceDraft } from '../hooks/useResourceDraft';
import { notify } from '../lib/notifications';
import { formatDate } from '../lib/utils';
import { deleteExam, saveExam, saveExamGrades } from '../services/commands/academic';
import { getGroupStudents } from '../services/enrollmentService';
import { loadExamsCatalog } from '../services/queries/exams';

export default function ExamsPage() {
  const task = useCommandTask();
  const { user, can } = useAuth();
  const canWrite = can('exams', 'create') || can('exams', 'edit');
  const canDelete = can('exams', 'delete');
  const [showModal, setShowModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', groupId: '', date: dayjs().format('YYYY-MM-DD'), maxGrade: 100,
  });

  const query = useCallback(() => loadExamsCatalog(user?.role, user?.teacherId), [user?.role, user?.teacherId]);
  const { data: { exams, groups, courses }, reload: load, error } = usePageResource(query, { exams: [], groups: [], courses: [] });

  const gradeQuery = useCallback(async () => {
    const [records, students] = selectedExam ? await Promise.all([
      readByIndex('grades', 'by-examId', selectedExam.id), getGroupStudents(selectedExam.groupId),
    ]) : [[], []];
    return { grades: Object.fromEntries(records.map(grade => [grade.studentId, grade.grade])), students };
  }, [selectedExam]);
  const { value: gradeData, setValue: setGradeData, ready: gradesReady, error: gradesError, reload: reloadGrades } = useResourceDraft<{
    grades: Record<string, number>; students: Student[];
  }>(selectedExam?.id || '', gradeQuery, { grades: {}, students: [] }, showGradesModal && !!selectedExam);
  const { grades, students: examGroupStudents } = gradeData;
  const setGrades = (grades: Record<string, number>) => setGradeData(current => ({ ...current, grades }));
  function openGrades(exam: Exam) {
    setSelectedExam(exam);
    setShowGradesModal(true);
  }

  async function handleSaveGrades() {
    if (!selectedExam || !gradesReady) return;
    await task.run(async () => { await saveExamGrades(user, selectedExam.id, grades); notify.success('تم حفظ الدرجات'); setShowGradesModal(false); });
  }

  async function handleSave() {
    await task.run(async () => { await saveExam(user, form, editing?.id); notify.success(editing ? 'تم تحديث الاختبار' : 'تم إضافة الاختبار'); setShowModal(false); await load(); });
  }

  if (error) return <PageReadError title="الاختبارات والدرجات" onRetry={load} />;

  return (
    <Layout title="الاختبارات والدرجات">
      <div className="space-y-5">
        {canWrite && (
          <div className="flex justify-end">
            <button onClick={() => { setEditing(null); setForm({ name: '', groupId: groups[0]?.id || '', date: dayjs().format('YYYY-MM-DD'), maxGrade: 100 }); setShowModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all">
              <Plus size={16} /> إضافة اختبار
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map(exam => {
            const group = groups.find(g => g.id === exam.groupId);
            const course = group ? courses.find(c => c.id === group.courseId) : null;
            return (
              <div key={exam.id} className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-5 hover:border-cyan-500/40 transition-all overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-400 transition-colors">{exam.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{group?.name} • {course?.name}</p>
                  </div>
                  <div className="flex gap-1">
                    {canWrite && (
                      <button onClick={() => { setEditing(exam); setForm({ name: exam.name, groupId: exam.groupId, date: exam.date, maxGrade: exam.maxGrade }); setShowModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-transparent hover:border-amber-500/20 transition-all"><Edit2 size={14} /></button>
                    )}
                    {canDelete && <button onClick={() => setDeleteId(exam.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all"><Trash2 size={14} /></button>}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{formatDate(exam.date)}</span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    العظمى: {exam.maxGrade}
                  </span>
                </div>
                <button onClick={() => openGrades(exam)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-xl text-sm font-bold transition-all shadow-sm">
                  <ClipboardList size={16} /> {canWrite ? 'إدخال الدرجات' : 'عرض الدرجات'}
                </button>
              </div>
            );
          })}
          {exams.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">لا توجد اختبارات</div>
          )}
        </div>
      </div>

      {/* Exam Form Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'تعديل الاختبار' : 'إضافة اختبار'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم الاختبار *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="مثال: الاختبار النصفي" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المجموعة *</label>
            <select value={form.groupId} onChange={e => setForm({...form, groupId: e.target.value})}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
              <option value="">اختر مجموعة</option>
              {groups.map(g => {
                const c = courses.find(c => c.id === g.courseId);
                return <option key={g.id} value={g.id} className="bg-slate-900 text-white">{g.name} - {c?.name}</option>;
              })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">التاريخ</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الدرجة العظمى</label>
              <input type="number" value={form.maxGrade} onChange={e => setForm({...form, maxGrade: +e.target.value})}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono" min="1" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={task.pending} className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
            {editing ? 'تحديث' : 'إضافة'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors">إلغاء</button>
        </div>
      </Modal>

      {/* Grades Modal */}
      {selectedExam && (
        <Modal isOpen={showGradesModal} onClose={() => setShowGradesModal(false)} title={`درجات: ${selectedExam.name}`} size="md">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">الدرجة العظمى للاختبار:</span>
              <span className="font-mono font-bold text-cyan-500 text-base">{selectedExam.maxGrade}</span>
            </div>
            {gradesError ? <ResourceError onRetry={reloadGrades} /> : !gradesReady ? <p role="status" className="p-6 text-center text-slate-400">جاري تحميل الدرجات...</p> : examGroupStudents.length === 0 ? (
              <p className="text-center text-slate-400 py-6">لا يوجد طلاب</p>
            ) : examGroupStudents.map(student => (
              <div key={student.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <span className="flex-1 text-sm font-bold text-slate-900 dark:text-white">{student.name}</span>
                <input type="number"
                  value={grades[student.id] ?? ''}
                  onChange={e => setGrades({...grades, [student.id]: +e.target.value})}
                  min={0} max={selectedExam.maxGrade}
                  placeholder={`0 - ${selectedExam.maxGrade}`}
                  className="w-24 px-3 py-1.5 bg-white dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            {canWrite && (
              <button onClick={handleSaveGrades} disabled={!gradesReady || task.pending} className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                حفظ الدرجات
              </button>
            )}
            <button onClick={() => setShowGradesModal(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors">إلغاء</button>
          </div>
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteId} title="حذف الاختبار" message="هل أنت متأكد؟"
        onConfirm={async () => {
          if (!deleteId) return;
          await task.run(async () => { await deleteExam(user, deleteId); notify.success('تم الحذف'); await load(); });
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)} danger />
    </Layout>
  );
}
