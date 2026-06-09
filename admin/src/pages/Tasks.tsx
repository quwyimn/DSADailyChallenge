import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Task {
  id: number;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Task[]>('/admin/tasks')
      .then(({ data }) => setTasks(data))
      .catch(() => setError('Failed to load tasks.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: '#ef4444' }}>{error}</p>;

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: 22 }}>Challenge Bank</h1>
      <p style={{ color: '#888' }}>Task CRUD — full form coming in Week 3</p>
      {tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th>ID</th><th>Type</th><th>Title</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td><code>{t.type}</code></td>
                <td>{t.title}</td>
                <td>{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse', width: '100%', background: '#fff',
  borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
};
