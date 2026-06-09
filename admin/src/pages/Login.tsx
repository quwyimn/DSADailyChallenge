import { useState } from 'react';
import { api } from '../services/api';
import { setAuthToken } from '../services/api';

interface Props {
  onLogin: (token: string) => void;
}

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post<{ token: string; user: { role: string } }>('/auth/login', {
        email,
        password,
      });
      if (data.user.role !== 'admin') {
        setError('Admin access only.');
        return;
      }
      setAuthToken(data.token);
      onLogin(data.token);
    } catch {
      setError('Invalid credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>DSA Admin</h1>
        {error && <p style={styles.error}>{error}</p>}
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" style={styles.btn} disabled={loading}>
          {loading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  form: { background: '#fff', padding: 40, borderRadius: 12, width: 360, boxShadow: '0 2px 12px rgba(0,0,0,.08)' },
  title: { margin: '0 0 24px', textAlign: 'center', fontSize: 22 },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 12 },
  input: { display: 'block', width: '100%', padding: '12px 14px', marginBottom: 14, border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '13px 0', background: '#4f87ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
};
