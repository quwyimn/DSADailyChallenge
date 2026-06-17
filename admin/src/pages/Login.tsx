import { useState } from 'react';
import { api, setAuthToken } from '../services/api';

interface Props {
  onLogin: (token: string, name: string) => void;
}

export function LoginPage({ onLogin }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post<{ token: string; user: { role: string; name: string } }>(
        '/auth/login',
        { email, password },
      );
      if (data.user.role !== 'admin') {
        setError('Admin access only.');
        return;
      }
      setAuthToken(data.token);
      onLogin(data.token, data.user.name);
    } catch {
      setError('Invalid credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.wrapper}>
      <form onSubmit={handleSubmit} style={s.form}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📚</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>DSA Admin</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Sign in to manage your challenges</p>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh', width: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9',
  },
  form: {
    background: '#fff', padding: '40px 36px', borderRadius: 14,
    width: 380, boxShadow: '0 4px 24px rgba(0,0,0,.09)',
  },
  field:  { display: 'flex', flexDirection: 'column', marginBottom: 16 },
  label:  { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:  {
    padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, outline: 'none', color: '#0f172a',
  },
  btn: {
    width: '100%', padding: '13px 0', background: '#4f87ff', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
    marginTop: 4,
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16,
  },
};
