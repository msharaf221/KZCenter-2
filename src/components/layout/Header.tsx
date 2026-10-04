import { Bell, Menu, Moon, Search, Sun, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { AppNotification, clearAppNotifications, getAppNotifications, markAppNotificationsAsRead } from '../../lib/notifications';
import { globalSearch, kindLabel, type SearchResult } from '../../lib/search';
import { formatDateTime, getContrastColor } from '../../lib/utils';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode, toggleDarkMode, setSidebarOpen, sidebarOpen, settings } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadNotifications = () => {
      setNotifications(getAppNotifications());
    };
    loadNotifications();
    window.addEventListener('app_notifications_updated', loadNotifications);
    return () => window.removeEventListener('app_notifications_updated', loadNotifications);
  }, []);

  // بحث شامل مُ debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !user?.role) { setResults([]); setSearchOpen(false); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      globalSearch({ query: q, role: user?.role, teacherId: user?.teacherId, currency: settings?.currency, limit: 10 })
        .then(r => { if (!cancelled) { setResults(r); setSearchOpen(true); } })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, user?.role, user?.teacherId, settings?.currency]);

  // Ctrl+K / Cmd+K يركّز على البحث
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // إغلاق قائمة النتائج عند الضغط خارجها
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = () => {
    markAppNotificationsAsRead();
  };

  const handleClear = () => {
    clearAppNotifications();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/70 h-16 shadow-xs"
      style={{ right: sidebarOpen ? '256px' : '64px', transition: 'right 0.3s ease' }}
    >
      <div className="flex items-center justify-between gap-2 h-full px-3 sm:px-6">
        {/* Right side */}
        <div className="flex items-center min-w-0 gap-2 sm:gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'طي القائمة الجانبية' : 'فتح القائمة الجانبية'}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors md:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl truncate font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Left side */}
        <div className="flex items-center shrink-0 gap-2 sm:gap-3">
          {/* بحث شامل (Ctrl+K) بنتائج فورية من كل الكيانات */}
          <div ref={searchBoxRef} className="relative hidden md:block">
            <div className="flex items-center gap-2.5 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl px-3.5 py-2 border border-slate-200/60 dark:border-slate-700/60 transition-all focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white dark:focus-within:bg-slate-900">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="بحث شامل في المركز..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => { if (results.length) setSearchOpen(true); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const first = results[0];
                    if (first?.to) { navigate(first.to); setSearchOpen(false); setQuery(''); }
                    else { const q = query.trim(); navigate(q ? `/students?q=${encodeURIComponent(q)}` : '/students'); }
                  } else if (e.key === 'Escape') {
                    setSearchOpen(false);
                  }
                }}
                className="bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none w-48 sm:w-60"
              />
              {searching ? (
                <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-2xs">
                  ⌘K
                </kbd>
              )}
            </div>

            {searchOpen && (
              <div className="absolute left-0 mt-2 w-96 max-h-96 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {results.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400 text-center">لا توجد نتائج لـ «{query}»</p>
                ) : (
                  results.map(r => (
                    <button
                      key={`${r.kind}-${r.id}`}
                      onClick={() => { if (r.to) navigate(r.to); setSearchOpen(false); setQuery(''); }}
                      className="w-full text-right px-4 py-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors flex items-center gap-3 cursor-pointer"
                    >
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {kindLabel(r.kind)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{r.title}</span>
                        {r.subtitle && <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{r.subtitle}</span>}
                      </span>
                      {r.badge && (
                        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {r.badge}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all hover:scale-105 active:scale-95"
            title={darkMode ? 'الوضع النهاري' : 'الوضع المظلم'}
          >
            {darkMode ? <Sun size={19} className="text-amber-400 animate-spin-slow" /> : <Moon size={19} />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications && unreadCount > 0) {
                  handleMarkRead();
                }
              }}
              className="relative p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all hover:scale-105 active:scale-95"
              aria-label="الإشعارات"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 glow-pulse ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden z-50">
                <div className="p-4 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">مركز الإشعارات</h3>
                    {unreadCount > 0 && (
                      <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} جديد
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={handleClear} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors" title="مسح الكل">
                      <Trash2 size={16} />
                    </button>
                    <button onClick={() => setShowNotifications(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors md:hidden">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="max-h-[380px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Bell size={32} className="mx-auto mb-3 opacity-25" />
                      <p className="text-sm font-medium">لا توجد إشعارات حالياً</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.map(notif => (
                        <div key={notif.id} className={`p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${!notif.read ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${!notif.read ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                              <Bell size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{notif.title}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">{notif.message}</p>
                              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500" dir="ltr">{formatDateTime(notif.date)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs cursor-pointer transition-transform hover:scale-105"
            style={{ backgroundColor: settings?.primaryColor || '#6366f1', color: getContrastColor(settings?.primaryColor || '#6366f1') }}
          >
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}
