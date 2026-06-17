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

  if (!token) return <LoginPage onLogin={handleLogin} />;

  const pageLabel = NAV.find((n) => n.key === page)?.label ?? '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <nav style={navStyle}>
        <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#4f87ff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            DSA Admin
          </div>
        </div>

        <div style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(({ key, label, icon }) => {
            const active = page === key;
            return (
              <button
                key={key}
                onClick={() => setPage(key)}
                style={{
                  ...navBtnBase,
                  background: active ? 'rgba(79,135,255,0.14)' : 'transparent',
                  color: active ? '#93c5fd' : '#94a3b8',
                  borderLeft: active ? '3px solid #4f87ff' : '3px solid transparent',
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span style={{ marginRight: 10, fontSize: 15 }}>{icon}</span>
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleLogout} style={{ ...navBtnBase, color: '#64748b' }}>
            <span style={{ marginRight: 10 }}>↩</span>Log out
          </button>
        </div>
      </nav>

      {/* ── Content area ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={topBarStyle}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{pageLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#4f87ff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700,
            }}>
              {(adminName || 'A').charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>
              {adminName || 'Admin'}
            </span>
          </div>
        </header>

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {page === 'tasks' && <TasksPage />}
          {page === 'classes' && <ClassesPage />}
          {page === 'assignments' && <AssignmentsPage />}
          {page === 'stats' && <StatsPage />}
        </main>
      </div>
    </div>
  );
}

const navStyle: React.CSSProperties = {
  width: 200,
  backgroundColor: '#1a2035',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
};

const navBtnBase: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  padding: '9px 14px',
  fontSize: 13,
  borderRadius: 6,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  marginBottom: 2,
};

const topBarStyle: React.CSSProperties = {
  height: 56,
  backgroundColor: '#fff',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 32px',
  flexShrink: 0,
};

export default App;
