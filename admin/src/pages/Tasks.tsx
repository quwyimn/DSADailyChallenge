import { useState, useEffect } from 'react';
import { tasksApi, TASK_TYPES } from '../services/api';
import type { Task } from '../services/api';

const EMPTY_FORM = { type: TASK_TYPES[0] as string, title: '', description: '', configText: '' };

function parseConfig(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text) as unknown;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) return v as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div style={m.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={m.dialog}>
        <div style={m.dialogHeader}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={m.closeBtn}>✕</button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

const m: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  dialog: {
    background: '#fff', borderRadius: 12, width: 560, maxWidth: '95vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
  },
  dialogHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: '1px solid #e2e8f0',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
    color: '#94a3b8', lineHeight: 1, padding: '4px 6px',
  },
};

interface TaskFormValues {
  type: string;
  title: string;
  description: string;
  configText: string;
}

interface TaskFormProps {
  values: TaskFormValues;
  onChange: (v: TaskFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  busy: boolean;
  configError: string;
  onConfigChange: (text: string) => void;
}

function TaskForm({ values, onChange, onSubmit, submitLabel, busy, configError, onConfigChange }: TaskFormProps) {
  const set = (key: keyof TaskFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...values, [key]: e.target.value });

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ ...s.field, flex: 1 }}>
          <label style={s.label}>Type</label>
          <select style={s.input} value={values.type} onChange={set('type')}>
            {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ ...s.field, flex: 2 }}>
          <label style={s.label}>Title</label>
          <input style={s.input} placeholder="Task title" value={values.title} onChange={set('title')} required />
        </div>
      </div>

      <div style={{ ...s.field, marginBottom: 14 }}>
        <label style={s.label}>Description (optional)</label>
        <input style={s.input} placeholder="Short description" value={values.description} onChange={set('description')} />
      </div>

      <div style={{ ...s.field, marginBottom: 18 }}>
        <label style={s.label}>Config (JSON)</label>
        <textarea
          style={{ ...s.input, height: 120, resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
          placeholder={'{\n  "array": [5, 3, 1, 4, 2],\n  "stepsToPredict": 5\n}'}
          value={values.configText}
          onChange={(e) => onConfigChange(e.target.value)}
          required
        />
        {configError && <span style={s.errorText}>{configError}</span>}
      </div>

      <button type="submit" style={s.btn} disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

export function TasksPage() {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Create modal
  const [showCreate,    setShowCreate]    = useState(false);
  const [createValues,  setCreateValues]  = useState<TaskFormValues>(EMPTY_FORM);
  const [createCfgErr,  setCreateCfgErr]  = useState('');
  const [creating,      setCreating]      = useState(false);

  // Edit modal
  const [editingTask,  setEditingTask]  = useState<Task | null>(null);
  const [editValues,   setEditValues]   = useState<TaskFormValues>(EMPTY_FORM);
  const [editCfgErr,   setEditCfgErr]   = useState('');
  const [updating,     setUpdating]     = useState(false);

  useEffect(() => {
    tasksApi.list()
      .then(setTasks)
      .catch(() => setError('Failed to load tasks.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateCfgErr('');
    const config = parseConfig(createValues.configText);
    if (!config) { setCreateCfgErr('Invalid JSON — must be an object.'); return; }
    setCreating(true);
    try {
      const created = await tasksApi.create({
        type: createValues.type,
        title: createValues.title,
        description: createValues.description || undefined,
        config,
      });
      setTasks((prev) => [created, ...prev]);
      setCreateValues(EMPTY_FORM);
      setShowCreate(false);
    } catch {
      setError('Failed to create task.');
    } finally {
      setCreating(false);
    }
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setEditValues({
      type: task.type,
      title: task.title,
      description: task.description ?? '',
      configText: JSON.stringify(task.config, null, 2),
    });
    setEditCfgErr('');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    setEditCfgErr('');
    const config = parseConfig(editValues.configText);
    if (!config) { setEditCfgErr('Invalid JSON — must be an object.'); return; }
    setUpdating(true);
    try {
      const updated = await tasksApi.update(editingTask.id, {
        type: editValues.type,
        title: editValues.title,
        description: editValues.description || undefined,
        config,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTask(null);
    } catch {
      setError('Failed to update task.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(id: number, taskTitle: string) {
    if (!window.confirm(`Delete task "${taskTitle}"? This cannot be undone.`)) return;
    try {
      await tasksApi.remove(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('Failed to delete task.');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 2 }}>Challenge Bank</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>{tasks.length} tasks total</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateValues(EMPTY_FORM); setCreateCfgErr(''); }} style={s.btn}>
          + New Task
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : tasks.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No tasks yet. Create one above.</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>ID</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Title</th>
                <th style={s.th}>Config preview</th>
                <th style={s.th}>Created</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} style={s.tr}>
                  <td style={{ ...s.td, color: '#94a3b8', fontSize: 12 }}>{t.id}</td>
                  <td style={s.td}><code>{t.type}</code></td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{t.title}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: '#64748b', maxWidth: 220 }}>
                    {JSON.stringify(t.config).slice(0, 60)}…
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {fmtDate(t.createdAt)}
                  </td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(t)} style={s.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(t.id, t.title)} style={{ ...s.deleteBtn, marginLeft: 6 }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="New Task" onClose={() => setShowCreate(false)}>
          <TaskForm
            values={createValues}
            onChange={setCreateValues}
            onSubmit={handleCreate}
            submitLabel="Create Task"
            busy={creating}
            configError={createCfgErr}
            onConfigChange={(text) => { setCreateValues((v) => ({ ...v, configText: text })); setCreateCfgErr(''); }}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editingTask && (
        <Modal title={`Edit Task #${editingTask.id}`} onClose={() => setEditingTask(null)}>
          <TaskForm
            values={editValues}
            onChange={setEditValues}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
            busy={updating}
            configError={editCfgErr}
            onConfigChange={(text) => { setEditValues((v) => ({ ...v, configText: text })); setEditCfgErr(''); }}
          />
        </Modal>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  btn:       { padding: '9px 18px', background: '#4f87ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  errorBox:  { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  tableWrap: { background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' },
  table:     { borderCollapse: 'collapse', width: '100%' },
  thead:     { background: '#f8fafc' },
  th:        { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr:        { borderBottom: '1px solid #f1f5f9' },
  td:        { padding: '12px 14px', fontSize: 13, verticalAlign: 'middle' },
  editBtn:   { background: 'none', border: '1px solid #bfdbfe', color: '#3b82f6', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  deleteBtn: { background: 'none', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  field:     { display: 'flex', flexDirection: 'column' },
  label:     { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input:     { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', width: '100%', color: '#0f172a' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' },
};
