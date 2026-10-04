import { Save } from 'lucide-react';
import type { SettingsSectionProps } from './types';

export default function GeneralSettingsSection({
  form,
  setForm,
  handleSaveGeneral,
}: SettingsSectionProps) {
  return (
    <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        الإعدادات العامة
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم المركز</label>
          <input
            type="text"
            value={form.centerName}
            onChange={e => setForm({ ...form, centerName: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">العنوان</label>
          <input
            type="text"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الهاتف</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">البريد الإلكتروني</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">العام الدراسي</label>
          <input
            type="text"
            value={form.academicYear}
            onChange={e => setForm({ ...form, academicYear: e.target.value })}
            placeholder="مثال: 2024-2025"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">العملة</label>
          <select
            value={form.currency}
            onChange={e => setForm({ ...form, currency: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070b14]/70 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="EGP" className="bg-slate-900 text-white">جنيه مصري (EGP)</option>
            <option value="SAR" className="bg-slate-900 text-white">ريال سعودي (SAR)</option>
            <option value="AED" className="bg-slate-900 text-white">درهم إماراتي (AED)</option>
            <option value="USD" className="bg-slate-900 text-white">دولار أمريكي (USD)</option>
          </select>
        </div>
      </div>
      <button
        onClick={handleSaveGeneral}
        className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
      >
        <Save size={16} /> حفظ الإعدادات العامة
      </button>
    </div>
  );
}
