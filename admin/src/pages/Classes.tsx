import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Class {
  id: number;
  name: string;
  grade: string;
}

export function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Class[]>('/classes')
      .then(({ data }) => setClasses(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post<Class>('/classes', { name, grade });
      setClasses((prev) => [...prev, data]);
      setName('');
      setGrade('');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/classes/${id}`);
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: 22 }}>Classes</h1>
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          style={inputStyle}
          placeholder="Class name (e.g. 12A)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          style={inputStyle}
          placeholder="Grade (e.g. Grade 12)"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          required
        />
        <button type="submit" style={btnStyle} disabled={saving}>
          {saving ? 'Adding…' : 'Add Class'}
        </button>
      </form>
      {classes.length === 0 ? (
        <p>No classes yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {classes.map((c) => (
            <li key={c.id} style={listItemStyle}>
              <span>{c.name} — {c.grade}</span>
              <button onClick={() => handleDelete(c.id)} style={deleteBtnStyle}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 };
const btnStyle: React.CSSProperties = { padding: '10px 20px', background: '#4f87ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' };
const listItemStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: 8, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,.05)' };
const deleteBtnStyle: React.CSSProperties = { background: 'none', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 };
