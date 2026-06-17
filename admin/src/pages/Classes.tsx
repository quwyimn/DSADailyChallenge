import { useState, useEffect } from 'react';
import { classesApi } from '../services/api';
import type { ClassItem } from '../services/api';

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
      <div className="w-full max-w-[400px] rounded-xl bg-white shadow-2xl">
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

export function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newGrade,   setNewGrade]   = useState('');
  const [creating,   setCreating]   = useState(false);

  // Edit modal
  const [editItem,   setEditItem]   = useState<ClassItem | null>(null);
  const [editName,   setEditName]   = useState('');
  const [editGrade,  setEditGrade]  = useState('');
  const [updating,   setUpdating]   = useState(false);

  useEffect(() => {
    classesApi.list()
      .then(setClasses)
      .catch(() => setError('Failed to load classes.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const created = await classesApi.create({ name: newName.trim(), grade: newGrade.trim() });
      setClasses((prev) => [...prev, created]);
      setNewName('');
      setNewGrade('');
      setShowCreate(false);
    } catch {
      setError('Failed to create class.');
    } finally {
      setCreating(false);
    }
  }

  function openEdit(c: ClassItem) {
    setEditItem(c);
    setEditName(c.name);
    setEditGrade(c.grade);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setUpdating(true);
    setError('');
    try {
      const updated = await classesApi.update(editItem.id, { name: editName.trim(), grade: editGrade.trim() });
      setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditItem(null);
    } catch {
      setError('Failed to update class.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete class "${name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await classesApi.remove(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Failed to delete class.');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-0.5 text-xl">Classes</h1>
          <p className="text-[13px] text-slate-500">{classes.length} classes total</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setNewName(''); setNewGrade(''); }}
          className="min-h-11 w-full rounded-lg bg-[#4f87ff] px-[18px] py-2.5 text-[13px] font-semibold text-white sm:w-auto"
        >
          + New Class
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : classes.length === 0 ? (
        <p className="text-slate-400">No classes yet. Create one above.</p>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {classes.map((c) => (
              <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.grade}</div>
                  </div>
                  <span className="text-xs text-slate-400">#{c.id}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)} className="min-h-11 flex-1 rounded-md border border-blue-200 text-xs font-medium text-blue-500">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="min-h-11 flex-1 rounded-md border border-red-300 text-xs font-medium text-red-500">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-[10px] bg-white shadow-sm md:block">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">ID</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Grade</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500" />
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="px-3.5 py-3 text-xs text-slate-400">{c.id}</td>
                    <td className="px-3.5 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-3.5 py-3 text-sm">{c.grade}</td>
                    <td className="whitespace-nowrap px-3.5 py-3">
                      <button onClick={() => openEdit(c)} className="rounded-md border border-blue-200 px-2.5 py-1 text-xs text-blue-500">Edit</button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="ml-1.5 rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-500">
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
        <Modal title="New Class" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="mb-3.5 flex flex-col">
              <label className="mb-1.5 text-xs font-semibold text-slate-700">Class Name</label>
              <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[13px] text-slate-900" placeholder="e.g. 12A1" value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus />
            </div>
            <div className="mb-5 flex flex-col">
              <label className="mb-1.5 text-xs font-semibold text-slate-700">Grade</label>
              <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[13px] text-slate-900" placeholder="e.g. Grade 12" value={newGrade} onChange={(e) => setNewGrade(e.target.value)} required />
            </div>
            <button type="submit" className="min-h-11 w-full rounded-lg bg-[#4f87ff] px-[18px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-70 sm:w-auto" disabled={creating}>
              {creating ? 'Creating…' : 'Create Class'}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editItem && (
        <Modal title={`Edit Class #${editItem.id}`} onClose={() => setEditItem(null)}>
          <form onSubmit={handleUpdate}>
            <div className="mb-3.5 flex flex-col">
              <label className="mb-1.5 text-xs font-semibold text-slate-700">Class Name</label>
              <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[13px] text-slate-900" value={editName} onChange={(e) => setEditName(e.target.value)} required autoFocus />
            </div>
            <div className="mb-5 flex flex-col">
              <label className="mb-1.5 text-xs font-semibold text-slate-700">Grade</label>
              <input className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[13px] text-slate-900" value={editGrade} onChange={(e) => setEditGrade(e.target.value)} required />
            </div>
            <button type="submit" className="min-h-11 w-full rounded-lg bg-[#4f87ff] px-[18px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-70 sm:w-auto" disabled={updating}>
              {updating ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
