import { useEffect, useState } from 'react';
import { LoginPage } from './pages/Login';
import { TasksPage } from './pages/Tasks';
import { ClassesPage } from './pages/Classes';
import { AssignmentsPage } from './pages/Assignments';
import { StatsPage } from './pages/Stats';
import { setAuthToken, setUnauthorizedHandler } from './services/api';

type Page = 'tasks' | 'classes' | 'assignments' | 'stats';

const NAV: { key: Page; label: string; icon: string }[] = [
  { key: 'tasks', label: 'Tasks', icon: '📋' },
  { key: 'classes', label: 'Classes', icon: '🏫' },
  { key: 'assignments', label: 'Assignments', icon: '📅' },
  { key: 'stats', label: 'Stats', icon: '📊' },
];

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [adminName, setAdminName] = useState<string>(() => localStorage.getItem('admin_name') ?? '');
  const [page, setPage] = useState<Page>('tasks');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (token) setAuthToken(token);
    setUnauthorizedHandler(handleLogout);
  }, [token]);

  function handleLogin(t: string, name: string) {
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin_name', name);
    setAuthToken(t);
    setToken(t);
    setAdminName(name);
  }

  function handleLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    setAuthToken(null);
    setToken(null);
    setAdminName('');
  }

  function selectPage(p: Page) {
    setPage(p);
    setSidebarOpen(false);
  }

  if (!token) return <LoginPage onLogin={handleLogin} />;

  const pageLabel = NAV.find((n) => n.key === page)?.label ?? '';

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Mobile backdrop ───────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <nav
        className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[80%] flex-shrink-0 flex-col bg-[#1a2035] text-white transition-transform duration-200 ease-in-out md:static md:z-auto md:w-52 md:max-w-none md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-[18px]">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#4f87ff]">
            DSA Admin
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex min-h-11 min-w-11 items-center justify-center text-lg text-slate-400 md:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 px-2 py-3">
          {NAV.map(({ key, label, icon }) => {
            const active = page === key;
            return (
              <button
                key={key}
                onClick={() => selectPage(key)}
                className={`mb-0.5 flex min-h-11 w-full items-center rounded-md border-l-[3px] px-3.5 py-2.5 text-left text-sm ${
                  active
                    ? 'border-[#4f87ff] bg-[#4f87ff]/15 font-semibold text-[#93c5fd]'
                    : 'border-transparent font-normal text-slate-400'
                }`}
              >
                <span className="mr-2.5 text-[15px]">{icon}</span>
                {label}
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/10 px-2 py-3">
          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center rounded-md px-3.5 py-2.5 text-left text-sm text-slate-500"
          >
            <span className="mr-2.5">↩</span>Log out
          </button>
        </div>
      </nav>

      {/* ── Content area ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 w-full flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex min-h-11 min-w-11 items-center justify-center text-2xl leading-none text-slate-600 md:hidden"
              aria-label="Open menu"
            >
              ☰
            </button>
            <span className="text-[15px] font-semibold text-slate-800">{pageLabel}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f87ff] text-[13px] font-bold text-white">
              {(adminName || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium text-slate-600 sm:inline">
              {adminName || 'Admin'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {page === 'tasks' && <TasksPage />}
          {page === 'classes' && <ClassesPage />}
          {page === 'assignments' && <AssignmentsPage />}
          {page === 'stats' && <StatsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
