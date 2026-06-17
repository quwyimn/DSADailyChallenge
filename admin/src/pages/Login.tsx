import { useState } from 'react';
import axios from 'axios';
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
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 400) {
          setError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
        } else if (!err.response) {
          setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
        } else {
          setError('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
        }
      } else {
        setError('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,.09)] sm:p-9">
        <div className="mb-7 text-center">
          <div className="mb-1.5 text-[28px]">📚</div>
          <h1 className="text-xl font-extrabold text-slate-900">DSA Admin</h1>
          <p className="mt-1 text-[13px] text-slate-500">Sign in to manage your challenges</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-col">
          <label className="mb-1.5 text-xs font-semibold text-slate-700">Email</label>
          <input
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="mb-4 flex flex-col">
          <label className="mb-1.5 text-xs font-semibold text-slate-700">Password</label>
          <input
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className={`mt-1 min-h-11 w-full rounded-lg bg-[#4f87ff] py-3 text-sm font-bold text-white ${loading ? 'opacity-70' : ''}`}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
