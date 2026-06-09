import { useEffect, useState } from 'react';
import { LoginPage } from './pages/Login';
import { TasksPage } from './pages/Tasks';
import { ClassesPage } from './pages/Classes';
import { setAuthToken } from './services/api';

type Page = 'tasks' | 'classes' | 'assignments' | 'stats';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [page, setPage] = useState<Page>('tasks');

  // Restore axios Authorization header after page refresh (state is loaded from
  // localStorage but the axios instance resets on every page load)
  useEffect(() => {
    if (token) setAuthToken(token);
  }, [token]);

  function handleLogin(t: string) {
    localStorage.setItem('admin_token', t);
    setAuthToken(t);
    setToken(t);
  }

  function handleLogout() {
    localStorage.removeItem('admin_token');
    setAuthToken(null);
    setToken(null);
  }

  if (!token) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={navStyle}>
        <h2 style={{ margin: '0 0 24px', fontSize: 16, fontWeight: 700 }}>DSA Admin</h2>
        {(['tasks', 'classes', 'assignments', 'stats'] as Page[]).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{ ...navBtnStyle, fontWeight: page === p ? 700 : 400 }}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        <button onClick={handleLogout} style={{ ...navBtnStyle, marginTop: 'auto', color: '#888' }}>
          Log out
        </button>
      </nav>
      <main style={{ flex: 1, padding: 32, backgroundColor: '#f9fafb' }}>
        {page === 'tasks' && <TasksPage />}
        {page === 'classes' && <ClassesPage />}
        {page === 'assignments' && <p>Assignments — coming in Week 3</p>}
        {page === 'stats' && <p>Stats — coming in Week 3</p>}
      </main>
    </div>
  );
}

const navStyle: React.CSSProperties = {
  width: 180,
  backgroundColor: '#1e293b',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 16px',
};
const navBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#cbd5e1',
  cursor: 'pointer',
  textAlign: 'left',
  padding: '8px 0',
  fontSize: 14,
};

export default App;
