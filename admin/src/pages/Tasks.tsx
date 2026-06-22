import { useState, useEffect } from 'react';
import { tasksApi, TASK_TYPES, extractErrorMessage } from '../services/api';
import type { Task } from '../services/api';
import { showToast } from '../services/toast';

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
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <span className="text-[15px] font-bold">{title}</span>
          <button
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center text-base text-slate-400"
          >
            ✕
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

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
      <div className="mb-3.5 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-col sm:flex-1">
          <label className="mb-1.5 text-xs font-semibold text-slate-700">Type</label>
          <select className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900" value={values.type} onChange={set('type')}>
            {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col sm:flex-[2]">
          <label className="mb-1.5 text-xs font-semibold text-slate-700">Title</label>
          <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900" placeholder="Task title" value={values.title} onChange={set('title')} required />
        </div>
      </div>

      <div className="mb-3.5 flex flex-col">
        <label className="mb-1.5 text-xs font-semibold text-slate-700">Description (optional)</label>
        <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900" placeholder="Short description" value={values.description} onChange={set('description')} />
      </div>

      <div className="mb-[18px] flex flex-col">
        <label className="mb-1.5 text-xs font-semibold text-slate-700">Config (JSON)</label>
        <textarea
          className="h-[120px] w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-base text-slate-900"
          placeholder={'{\n  "array": [5, 3, 1, 4, 2],\n  "stepsToPredict": 5\n}'}
          value={values.configText}
          onChange={(e) => onConfigChange(e.target.value)}
          required
        />
        {configError && <span className="mt-1 block text-xs text-red-500">{configError}</span>}
      </div>

      <button type="submit" className="min-h-11 w-full rounded-lg bg-[#4f87ff] px-[18px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-70 sm:w-auto" disabled={busy}>
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
      showToast('Đã thêm thành công', 'success');
    } catch (err) {
      const msg = extractErrorMessage(err);
      showToast(msg ? `Thêm thất bại: ${msg}` : 'Thêm thất bại', 'error');
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
      showToast('Đã xóa thành công', 'success');
    } catch (err) {
      const msg = extractErrorMessage(err);
      showToast(msg ? `Xóa thất bại: ${msg}` : 'Xóa thất bại', 'error');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-0.5 text-xl">Challenge Bank</h1>
          <p className="text-[13px] text-slate-500">{tasks.length} tasks total</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateValues(EMPTY_FORM); setCreateCfgErr(''); }}
          className="min-h-11 w-full rounded-lg bg-[#4f87ff] px-[18px] py-2.5 text-[13px] font-semibold text-white sm:w-auto"
        >
          + New Task
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-slate-400">No tasks yet. Create one above.</p>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <code className="text-xs">{t.type}</code>
                  <span className="text-xs text-slate-400">{fmtDate(t.createdAt)}</span>
                </div>
                <div className="mb-1.5 text-sm font-medium">{t.title}</div>
                <div className="mb-3 break-all font-mono text-xs text-slate-500">
                  {JSON.stringify(t.config).slice(0, 80)}…
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(t)} className="min-h-11 flex-1 rounded-md border border-blue-200 text-xs font-medium text-blue-500">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(t.id, t.title)} className="min-h-11 flex-1 rounded-md border border-red-300 text-xs font-medium text-red-500">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-[10px] bg-white shadow-sm md:block">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">ID</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Title</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Config preview</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Created</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="px-3.5 py-3 text-xs text-slate-400">{t.id}</td>
                    <td className="px-3.5 py-3 text-sm"><code>{t.type}</code></td>
                    <td className="px-3.5 py-3 text-sm font-medium">{t.title}</td>
                    <td className="max-w-[220px] truncate px-3.5 py-3 font-mono text-[11px] text-slate-500">
                      {JSON.stringify(t.config).slice(0, 60)}…
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-xs text-slate-400">
                      {fmtDate(t.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3">
                      <button onClick={() => openEdit(t)} className="rounded-md border border-blue-200 px-2.5 py-1 text-xs text-blue-500">Edit</button>
                      <button onClick={() => handleDelete(t.id, t.title)} className="ml-1.5 rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-500">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
