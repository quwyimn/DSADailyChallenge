import { useState, useEffect } from 'react';
import { tasksApi, assignmentsApi } from '../services/api';
import type { Task, Assignment } from '../services/api';

function todayStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function fmtDate(isoStr: string): string {
  return isoStr.split('T')[0];
}

export function AssignmentsPage() {
  const [date, setDate] = useState(todayStr);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [loadingAsgn, setLoadingAsgn] = useState(false);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Load all tasks once (for the assign dropdown)
  useEffect(() => {
    let cancelled = false;
    function fetchTasks(attempt: number) {
      tasksApi.list()
        .then((data) => { if (!cancelled) setTasks(data); })
        .catch(() => {
          if (!cancelled && attempt < 3) {
            setTimeout(() => fetchTasks(attempt + 1), 300 * attempt);
          } else if (!cancelled) {
            setError('Failed to load tasks.');
          }
        });
    }
    fetchTasks(1);
    return () => { cancelled = true; };
  }, []);

  // Reload assignments when date changes
  useEffect(() => {
    let cancelled = false;
    setLoadingAsgn(true);
    setError('');
    function fetchAssignments(attempt: number) {
      assignmentsApi
        .listByDate(date)
        .then(async (data) => {
          if (!cancelled) {
            if (data.length === 0 && attempt === 1) {
              // Auto-generate for this date then reload
              try {
                await assignmentsApi.generate(date);
                const generated = await assignmentsApi.listByDate(date);
                if (!cancelled) {
                  setAssignments(generated);
                  setLoadingAsgn(false);
                }
              } catch {
                if (!cancelled) {
                  setAssignments([]);
                  setLoadingAsgn(false);
                }
              }
            } else {
              setAssignments(data);
              setLoadingAsgn(false);
            }
          }
        })
        .catch(() => {
          if (!cancelled && attempt < 3) {
            setTimeout(() => fetchAssignments(attempt + 1), 300 * attempt);
          } else if (!cancelled) {
            setError('Failed to load assignments.');
            setLoadingAsgn(false);
          }
        });
    }
    fetchAssignments(1);
    return () => { cancelled = true; };
  }, [date]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTaskId) return;
    setAssigning(true);
    setError('');
    try {
      await assignmentsApi.create(selectedTaskId as number, date);
      // Reload so we get full task details in the list
      const updated = await assignmentsApi.listByDate(date);
      setAssignments(updated);
      setSelectedTaskId('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to assign task (may already be assigned).');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(id: number) {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await assignmentsApi.remove(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Failed to remove assignment.');
    }
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: 22 }}>Assignments</h1>

      {error && <p style={s.errorText}>{error}</p>}

      {/* Date picker */}
      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Date</label>
          <input
            type="date"
            style={s.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Assign form */}
      <form onSubmit={handleAssign} style={s.assignForm}>
        <select
          style={s.select}
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : '')}
          required
        >
          <option value="">— select a task —</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              [{t.type}] {t.title}
            </option>
          ))}
        </select>
        <button type="submit" style={s.btn} disabled={assigning || !selectedTaskId}>
          {assigning ? 'Assigning…' : `Assign to ${date}`}
        </button>
      </form>

      {/* Assignments table */}
      {loadingAsgn ? (
        <p>Loading…</p>
      ) : assignments.length === 0 ? (
        <p style={{ color: '#888', marginTop: 16 }}>No tasks assigned on {date}.</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}>ID</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Task type</th>
              <th style={s.th}>Task title</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} style={s.tr}>
                <td style={s.td}>{a.id}</td>
                <td style={s.td}>{fmtDate(a.date)}</td>
                <td style={s.td}><code>{a.task.type}</code></td>
                <td style={s.td}>{a.task.title}</td>
                <td style={s.td}>
                  <button onClick={() => handleRemove(a.id)} style={s.deleteBtn}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  row: { display: 'flex', gap: 12, marginBottom: 16 },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 },
  input: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' },
  assignForm: { display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' },
  select: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, minWidth: 280 },
  btn: { padding: '10px 22px', background: '#4f87ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 12, display: 'block' },
  table: { borderCollapse: 'collapse', width: '100%', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' },
  thead: { background: '#f8fafc' },
  th: { padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 14px', fontSize: 14, verticalAlign: 'middle' },
  deleteBtn: { background: 'none', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 },
};
