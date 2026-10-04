import { Save } from 'lucide-react';
import { COLORS, getContrastColor } from '../../lib/utils';
import type { SettingsSectionProps } from './types';

export default function AppearanceSettingsSection({
  form,
  setForm,
  handleSaveGeneral,
}: SettingsSectionProps) {
  return (
    <div className="glow-card relative bg-white/95 dark:bg-[#0c1324]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        المظهر وتخصيص الواجهة
      </h2>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">اللون الرئيسي للنظام</label>
          <div className="flex flex-wrap gap-3">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setForm({ ...form, primaryColor: color })}
                className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 shadow-sm
                      ${form.primaryColor === color ? 'ring-2 ring-cyan-400 scale-110 shadow-[0_0_12px_#00f0ff]' : 'border-white/20'}`}
                style={{ backgroundColor: color, color: getContrastColor(color) }}
              />
            ))}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                className="w-9 h-9 rounded-full cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-slate-400">مخصص</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">حجم الخط</label>
          <div className="flex gap-3">
            {[
              { value: 'sm', label: 'صغير' },
              { value: 'md', label: 'متوسط' },
              { value: 'lg', label: 'كبير' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setForm({ ...form, fontSize: opt.value as 'sm' | 'md' | 'lg' })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all
                      ${form.fontSize === opt.value ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={handleSaveGeneral}
        className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
      >
        <Save size={16} /> تطبيق المظهر
      </button>
    </div>
  );
}
