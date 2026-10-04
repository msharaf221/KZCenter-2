import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getVisibleNavigation } from '../../app/routes';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { DebtAlert, refreshDebtAlert, subscribeDebtAlert } from '../../lib/debtAlerts';
import { ROLE_LABEL } from '../../lib/permissions';
import { getContrastColor } from '../../lib/utils';

const SIDEBAR_SCROLL_KEY = 'educenter_sidebar_scroll_top';

// In-memory cache for synchronous scroll position restoration across route transitions
let cachedSidebarScrollTop = (() => {
  try {
    const val = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    const num = Number(val);
    return Number.isFinite(num) && num > 0 ? num : 0;
  } catch {
    return 0;
  }
})();

function saveScrollPosition(value: number) {
  if (value > 0) {
    cachedSidebarScrollTop = value;
    try {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(value));
    } catch {
      // ignore storage errors
    }
  } else if (value === 0 && cachedSidebarScrollTop === 0) {
    try {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, '0');
    } catch {
      // ignore storage errors
    }
  }
}

export default function Sidebar() {
  const { user, logout, can } = useAuth();
  const { sidebarOpen, setSidebarOpen, settings } = useApp();
  const [debtAlert, setDebtAlert] = useState<DebtAlert | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const isRestoringRef = useRef(cachedSidebarScrollTop > 0);

  const restoreScroll = useCallback(() => {
    const el = navRef.current;
    if (!el || cachedSidebarScrollTop <= 0) return true;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return false;
    const target = Math.min(cachedSidebarScrollTop, maxScroll);
    el.scrollTop = target;
    return Math.abs(el.scrollTop - target) <= 1;
  }, []);

  // Restore scroll position synchronously before browser paint
  useLayoutEffect(() => {
    if (cachedSidebarScrollTop > 0) {
      isRestoringRef.current = true;
      restoreScroll();
    }
  }, [restoreScroll]);

  // Multi-phase restoration: handles double rAF, font loading, layout settling, and resizing
  useEffect(() => {
    if (cachedSidebarScrollTop <= 0) {
      isRestoringRef.current = false;
      return;
    }

    isRestoringRef.current = true;
    let cancelled = false;

    const raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      restoreScroll();
      const raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        restoreScroll();
      });
      rafIds.push(raf2);
    });

    const rafIds = [raf1];
    const timers = [
      setTimeout(() => {
        if (!cancelled) restoreScroll();
      }, 30),
      setTimeout(() => {
        if (!cancelled) restoreScroll();
      }, 100),
      setTimeout(() => {
        if (!cancelled) restoreScroll();
      }, 250),
      setTimeout(() => {
        if (!cancelled) {
          restoreScroll();
          isRestoringRef.current = false;
        }
      }, 500),
    ];

    let ro: ResizeObserver | null = null;
    if (navRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (!cancelled && cachedSidebarScrollTop > 0) {
          restoreScroll();
        }
      });
      ro.observe(navRef.current);
    }

    return () => {
      cancelled = true;
      rafIds.forEach(id => cancelAnimationFrame(id));
      timers.forEach(id => clearTimeout(id));
      ro?.disconnect();
    };
  }, [restoreScroll]);

  const captureScroll = useCallback(() => {
    const el = navRef.current;
    if (el && el.scrollTop > 0) {
      saveScrollPosition(el.scrollTop);
    }
  }, []);

  const handleNavScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const top = e.currentTarget.scrollTop;
    // Discard false 0-scroll events emitted by layout clamping during initial mounting
    if (isRestoringRef.current && top === 0 && cachedSidebarScrollTop > 0) {
      return;
    }
    if (isRestoringRef.current && Math.abs(top - cachedSidebarScrollTop) <= 2) {
      isRestoringRef.current = false;
    }
    saveScrollPosition(top);
  }, []);

  const handleUserInteraction = useCallback(() => {
    isRestoringRef.current = false;
    captureScroll();
  }, [captureScroll]);

  // Safe unmount: only record positive scroll; never overwrite valid cache with 0 from detached element
  useEffect(() => {
    const el = navRef.current;
    return () => {
      if (el && el.scrollTop > 0) {
        saveScrollPosition(el.scrollTop);
      }
    };
  }, []);

  // تنبيه المديونيات (لمن يقدر يشوف المديونيات) — الحساب بيتعمل مرة كل دقيقة على الأكثر
  const canSeeDebtors = can('debtors', 'view');
  useEffect(() => {
    if (!canSeeDebtors) return;
    const unsubscribe = subscribeDebtAlert(setDebtAlert);
    void refreshDebtAlert();
    return unsubscribe;
  }, [canSeeDebtors]);

  const visibleItems = getVisibleNavigation(user?.role);

  return (
    <aside
      dir="rtl"
      className={`
        fixed top-0 right-0 h-full z-40 flex flex-col
        bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl
        border-l border-slate-200/80 dark:border-slate-800/80
        shadow-[0_4px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)]
        sidebar-transition select-none
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}
    >
      {/* Top luminous accent edge */}
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${settings?.primaryColor || '#6366f1'}, transparent)`,
        }}
      />

      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/70 dark:border-slate-800/70 min-h-[64px]">
        {sidebarOpen && (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div
                className="absolute inset-0 rounded-xl blur-xs opacity-60"
                style={{ backgroundColor: settings?.primaryColor || '#6366f1' }}
              />
              <div
                className="relative w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-xs"
                style={{
                  backgroundColor: settings?.primaryColor || '#6366f1',
                  color: getContrastColor(settings?.primaryColor || '#6366f1'),
                }}
              >
                E
              </div>
            </div>
            <span className="font-bold text-gray-900 text-sm whitespace-nowrap overflow-visible flex-1 min-w-max px-2 text-right leading-relaxed">
              {settings?.centerName || 'EduCenter Pro'}
            </span>
          </div>
        )}
        {!sidebarOpen && (
          <div className="relative mx-auto shrink-0">
            <div
              className="absolute inset-0 rounded-xl blur-xs opacity-50"
              style={{ backgroundColor: settings?.primaryColor || '#6366f1' }}
            />
            <div
              className="relative w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-xs"
              style={{
                backgroundColor: settings?.primaryColor || '#6366f1',
                color: getContrastColor(settings?.primaryColor || '#6366f1'),
              }}
            >
              E
            </div>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0"
          aria-label={sidebarOpen ? 'تصغير القائمة الجانبية' : 'توسيع القائمة الجانبية'}
        >
          {sidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav
        ref={navRef}
        onScroll={handleNavScroll}
        onPointerDownCapture={handleUserInteraction}
        onClickCapture={captureScroll}
        onWheel={handleUserInteraction}
        onTouchStart={handleUserInteraction}
        className="flex-1 overflow-y-auto py-3 px-2 space-y-1"
      >
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={captureScroll}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl
              transition-all duration-200 group relative
              ${isActive
                ? 'text-white shadow-md shadow-indigo-500/20 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              }
              ${!sidebarOpen ? 'justify-center px-0' : ''}
            `}
            style={({ isActive }) =>
              isActive
                ? {
                    backgroundColor: settings?.primaryColor || '#6366f1',
                    color: getContrastColor(settings?.primaryColor || '#6366f1'),
                  }
                : {}
            }
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
              <item.icon size={20} />
            </span>
            {sidebarOpen && (
              <span className="font-medium text-sm whitespace-nowrap overflow-visible flex-1 min-w-max px-2 text-right leading-relaxed">
                {item.label}
              </span>
            )}
            {item.debtBadge &&
              debtAlert &&
              debtAlert.debtorsCount > 0 &&
              (sidebarOpen ? (
                <span className="ms-auto shrink-0 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-xs">
                  {debtAlert.debtorsCount}
                </span>
              ) : (
                <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              ))}
            {!sidebarOpen && (
              <div
                className="absolute right-full mr-2.5 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl
                opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 shadow-xl border border-white/10 leading-normal"
              >
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info & Logout */}
      <div className="border-t border-slate-200/70 dark:border-slate-800/70 p-3">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs"
                style={{
                  backgroundColor: settings?.primaryColor || '#6366f1',
                  color: getContrastColor(settings?.primaryColor || '#6366f1'),
                }}
              >
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="flex-1 min-w-max px-2 overflow-visible">
              <p className="text-sm font-semibold text-gray-900 whitespace-nowrap overflow-visible text-right leading-relaxed">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 whitespace-nowrap overflow-visible text-right leading-relaxed">
                {user?.role ? ROLE_LABEL[user.role] : ''}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors shrink-0"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full flex justify-center p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors shrink-0"
            title="تسجيل الخروج"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
