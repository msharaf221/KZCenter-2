import dayjs from 'dayjs';
import { AlertCircle, CheckCircle, Clock, CreditCard, LogOut, MessageCircle, Printer, Save, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import Layout from '../components/layout/Layout';
import PageReadError from '../components/layout/PageReadError';
import ResourceError from '../components/ui/ResourceError';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { AttendanceStatus } from '../domain/models';
import BarcodeScannerInput from '../features/attendance/BarcodeScannerInput';
import { useCommandTask } from '../hooks/useCommandTask';
import { usePageResource } from '../hooks/usePageResource';
import { useResourceDraft } from '../hooks/useResourceDraft';
import { checkAbsenceAlertForStudent } from '../lib/absenceAlerts';
import { notify, notifyAbsence, notifyAttendanceSaved, notifyRepeatedAbsence } from '../lib/notifications';
import { printBatchStudentCards, printTable } from '../lib/printing';
import { formatDate, getContrastColor, getWhatsAppLink } from '../lib/utils';
import { checkOutStudent, saveAttendance } from '../services/commands/academic';
import { loadAttendanceCatalog, loadAttendanceRegister, type AttendanceRegister } from '../services/queries/attendance';

export default function AttendancePage() {
  const task = useCommandTask();
  const { settings } = useApp();
  const { user, can } = useAuth();
  const canRecord = can('attendance', 'create') || can('attendance', 'edit');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const saving = task.pending;
  /** الطلاب اللي التحقوا بالمجموعة بعد تاريخ الكشف — ماينفعش يتسجللهم غياب عن يوم قبل ما يدخلوا */

  const catalogQuery = useCallback(() => loadAttendanceCatalog(user?.role, user?.teacherId), [user?.role, user?.teacherId]);
  const { data: { groups, courses }, loading: catalogLoading, error: catalogError, reload: reloadCatalog } = usePageResource(catalogQuery, { groups: [], courses: [] });
  useEffect(() => {
    if (!catalogLoading && !groups.some(group => group.id === selectedGroup)) setSelectedGroup(groups[0]?.id || '');
  }, [catalogLoading, groups, selectedGroup]);
  const registerQuery = useCallback(() => loadAttendanceRegister(selectedGroup, selectedDate), [selectedGroup, selectedDate]);
  const { value: register, setValue: setRegister, ready: registerReady, error: registerError, reload: loadAttendance } = useResourceDraft<AttendanceRegister>(
    `${selectedGroup}:${selectedDate}`, registerQuery,
    { records: [], students: [], statuses: {}, lateJoiners: new Set() },
    !catalogLoading && !catalogError && !!selectedDate && groups.some(group => group.id === selectedGroup),
  );
  const { records: existingAttendance, students: groupStudents, statuses: attendanceMap, lateJoiners } = register;
  function setAttendanceMap(action: SetStateAction<Record<string, AttendanceStatus>>) {
    setRegister(current => ({ ...current, statuses: typeof action === 'function' ? action(current.statuses) : action }));
  }

  const group = groups.find(g => g.id === selectedGroup);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  }

  function setAll(status: AttendanceStatus) {
    setAttendanceMap(prev => {
      const map: Record<string, AttendanceStatus> = { ...prev };
      groupStudents.forEach(s => {
        // اللي التحق بعد تاريخ الكشف ماياخدش حالة بالجملة (مكانش موجود)
        if (lateJoiners.has(s.id)) return;
        map[s.id] = status;
      });
      return map;
    });
  }

  async function handleSave() {
    if (!registerReady) return;
    await task.run(async () => {
      const saved = await saveAttendance(user, { groupId: selectedGroup, date: selectedDate, studentIds: groupStudents.map(student => student.id), statuses: attendanceMap });
      for (const student of saved.newlyAbsent) notifyAbsence(student.name, saved.group.name);
      for (const student of saved.absent) {
        try {
          const alert = await checkAbsenceAlertForStudent(student.id, saved.group.id);
          if (alert) notifyRepeatedAbsence(student.name, saved.group.name, alert.streak);
        } catch (error) { console.error('absence alert check error:', error); }
      }
      notifyAttendanceSaved(saved.group.name, saved.savedCount);
      await loadAttendance();
    });
  }

  async function handleCheckOut(studentId: string) {
    const record = existingAttendance.find(row => row.studentId === studentId);
    if (!record) { notify.error('يجب تسجيل الحضور أولاً'); return; }
    await task.run(async () => { await checkOutStudent(user, record.id); notify.success('تم تسجيل وقت الخروج'); await loadAttendance(); });
  }

  /** ورقة حضور قابلة للطباعة (RTL) للقائمة والحالة الحالية */
  function handlePrintSheet() {
    if (!selectedGroup || !registerReady) { notify.error('انتظر تحميل كشف الحضور أولاً'); return; }
    const group = groups.find(g => g.id === selectedGroup);
    const course = courses.find(c => c.id === group?.courseId);
    const statusLabel: Record<AttendanceStatus, string> = {
      present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'مستأذن',
    };
    const rows = eligibleStudents.map((s, i) => ({
      no: i + 1,
      name: s.name,
      status: attendanceMap[s.id] ? statusLabel[attendanceMap[s.id]] : statusLabel.absent,
    }));
    printTable({
      title: `ورقة حضور — ${group?.name ?? ''}`,
      subtitle: course ? `كورس: ${course.name}` : undefined,
      settings,
      meta: [
        { label: 'التاريخ', value: formatDate(selectedDate, 'YYYY/MM/DD') },
        { label: 'المجموعة', value: group?.name ?? '' },
      ],
      totals: [
        { label: 'حاضر', value: String(counts.present) },
        { label: 'غائب', value: String(counts.absent) },
        { label: 'متأخر', value: String(counts.late) },
        { label: 'مستأذن', value: String(counts.excused) },
      ],
      rows,
      columns: [
        { key: 'no', label: '#', align: 'center', width: '40px' },
        { key: 'name', label: 'اسم الطالب' },
        { key: 'status', label: 'الحالة', align: 'center' },
      ],
    });
  }

  function handlePrintCards() {
    if (!selectedGroup || !registerReady || groupStudents.length === 0) {
      notify.error('لا يوجد طلاب لطباعة الكارنيهات');
      return;
    }
    const targetGroup = groups.find(g => g.id === selectedGroup);
    const targetCourse = courses.find(c => c.id === targetGroup?.courseId);
    printBatchStudentCards(groupStudents, {
      settings,
      groupName: targetGroup?.name,
      courseName: targetCourse?.name,
    });
  }

  const statusButtons = [
    { status: 'present' as AttendanceStatus, label: 'حاضر', icon: <CheckCircle size={14} />, color: 'bg-green-100 text-green-700 border-green-200' },
    { status: 'absent' as AttendanceStatus, label: 'غائب', icon: <XCircle size={14} />, color: 'bg-red-100 text-red-700 border-red-200' },
    { status: 'late' as AttendanceStatus, label: 'متأخر', icon: <Clock size={14} />, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { status: 'excused' as AttendanceStatus, label: 'مستأذن', icon: <AlertCircle size={14} />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ];

  /** الطلاب اللي ينطبق عليهم الكشف ده (الموجودين فعلًا في تاريخه) */
  const eligibleStudents = groupStudents.filter(s => !lateJoiners.has(s.id));

  const counts = {
    present: eligibleStudents.filter(s => attendanceMap[s.id] === 'present').length,
    absent: eligibleStudents.filter(s => (attendanceMap[s.id] || 'absent') === 'absent').length,
    late: eligibleStudents.filter(s => attendanceMap[s.id] === 'late').length,
    excused: eligibleStudents.filter(s => attendanceMap[s.id] === 'excused').length,
  };

  if (catalogError) return <PageReadError title="تسجيل الحضور" onRetry={reloadCatalog} />;

  return (
    <Layout title="تسجيل الحضور">
      <div className="space-y-5">
        {registerError && <ResourceError onRetry={loadAttendance} />}
        {/* Controls */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm relative">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">المجموعة</label>
              <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 cursor-pointer">
                {groups.map(g => {
                  const c = courses.find(c => c.id === g.courseId);
                  return <option key={g.id} value={g.id}>{g.name} - {c?.name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">التاريخ</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white/80 dark:bg-[#070b14]/90 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 font-mono" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handlePrintSheet} disabled={!registerReady} title="طباعة ورقة الحضور"
                className="py-2.5 px-3.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-white/10 transition-colors no-print">
                <Printer size={16} />
              </button>
              <button onClick={handlePrintCards} disabled={!registerReady || groupStudents.length === 0} title="كارنيهات طلاب المجموعة مع الباركود"
                className="py-2.5 px-3.5 bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 border border-indigo-500/20 dark:border-cyan-400/20 rounded-xl text-sm font-medium hover:bg-indigo-500/20 transition-colors no-print">
                <CreditCard size={16} />
              </button>
              <button onClick={() => setAll('present')}
                className="flex-1 py-2.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 rounded-xl text-xs font-bold hover:bg-emerald-500/25 transition-all">
                ✓ الكل حاضر
              </button>
              <button onClick={() => setAll('absent')}
                className="flex-1 py-2.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 rounded-xl text-xs font-bold hover:bg-rose-500/25 transition-all">
                ✗ الكل غائب
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'حاضر', count: counts.present, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
              { label: 'غائب', count: counts.absent, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
              { label: 'متأخر', count: counts.late, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
              { label: 'مستأذن', count: counts.excused, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
            ].map(item => (
              <div key={item.label} className={`p-3.5 rounded-2xl text-center border backdrop-blur-md ${item.color}`}>
                <p className="text-2xl sm:text-3xl font-black telemetry-number">{registerReady ? item.count : '—'}</p>
                <p className="text-xs font-bold mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* شريط المسح السريع بالباركود و QR */}
        {group && groupStudents.length > 0 && (
          <BarcodeScannerInput
            students={groupStudents}
            currentStatuses={attendanceMap}
            lateJoiners={lateJoiners}
            onMarkAttendance={setStatus}
            disabled={!registerReady || !canRecord}
          />
        )}

        {/* Students List */}
        {group && groupStudents.length > 0 ? (
          <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-white/5">
              <h3 className="font-bold text-slate-900 dark:text-white">طلاب: {group.name}</h3>
              <p className="text-xs font-medium text-slate-400">{groupStudents.length} طالب • {formatDate(selectedDate)}</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {groupStudents.map((student, idx) => {
                const status = attendanceMap[student.id];
                const attendance = existingAttendance.find(r => r.studentId === student.id);
                const isLateJoiner = lateJoiners.has(student.id) && !attendance;
                return (
                  <div key={student.id} className={`flex items-center gap-4 p-4 transition-colors ${isLateJoiner ? 'bg-slate-50/50 dark:bg-white/5 opacity-70' : 'hover:bg-slate-50/80 dark:hover:bg-white/5'}`}>
                    <span className="w-6 text-sm text-slate-400 font-mono">{idx + 1}</span>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 dark:from-cyan-500/20 dark:to-indigo-500/20 border border-indigo-500/25 dark:border-cyan-400/30 flex items-center justify-center text-base shrink-0 shadow-xs">
                      {student.gender === 'male' ? '👦' : '👧'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        {student.name}
                        {isLateJoiner && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                            التحق بعد هذا التاريخ — لا يُحتسب
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">{student.parentPhone}</p>
                      {attendance?.checkInTime && (
                        <p className="text-xs text-emerald-500 font-medium mt-1 font-mono">دخول: {attendance.checkInTime}
                          {attendance.checkOutTime && ` • خروج: ${attendance.checkOutTime}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isLateJoiner && (
                        <span className="text-[11px] text-gray-400 ml-2">غير مشمول بالكشف</span>
                      )}
                      {statusButtons.map(btn => (
                        <button key={btn.status}
                          disabled={isLateJoiner}
                          onClick={() => !isLateJoiner && setStatus(student.id, btn.status)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed
                            ${status === btn.status ? btn.color + ' border-current shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}>
                          {btn.icon}
                          <span className="hidden sm:inline">{btn.label}</span>
                        </button>
                      ))}
                      {!isLateJoiner && status === 'present' && attendance && !attendance.checkOutTime && (
                        <button onClick={() => handleCheckOut(student.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100">
                          <LogOut size={14} />
                          <span className="hidden sm:inline">خروج</span>
                        </button>
                      )}
                      {!isLateJoiner && status === 'absent' && student.parentPhone && (
                        <a href={getWhatsAppLink(student.parentPhone, `نود إعلامكم بغياب الطالب/ة ${student.name} عن مجموعة ${group.name} بتاريخ ${formatDate(selectedDate)}.`)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-green-50 text-green-700 border-green-200 hover:bg-green-100" title="إرسال عبر واتساب">
                          <MessageCircle size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={handleSave} disabled={saving || !canRecord || !registerReady}
                title={canRecord ? '' : 'ليس لديك صلاحية تسجيل الحضور'}
                className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
                style={{ backgroundColor: settings?.primaryColor || '#6366f1', color: getContrastColor(settings?.primaryColor || '#6366f1') }}>
                <Save size={18} />
                {saving ? 'جاري الحفظ...' : 'حفظ الحضور'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-lg">
              {!selectedGroup ? 'اختر مجموعة لتسجيل الحضور' : 'لا يوجد طلاب في هذه المجموعة'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
