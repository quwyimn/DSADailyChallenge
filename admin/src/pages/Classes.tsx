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
    <div style={m.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={m.dialog}>
        <div style={m.header}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={m.closeBtn}>✕</button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

const m: Record<string, React.CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  dialog:   { background: '#fff', borderRadius: 12, width: 400, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: '4px 6px' },
};

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 2 }}>Classes</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>{classes.length} classes total</p>
        </div>
        <button onClick={() => { setShowCreate(true); setNewName(''); setNewGrade(''); }} style={s.btn}>
          + New Class
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : classes.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No classes yet. Create one above.</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>ID</th>
                <th style={s.th}>Name</th>
                <th style={s.th}>Grade</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} style={s.tr}>
                  <td style={{ ...s.td, color: '#94a3b8', fontSize: 12 }}>{c.id}</td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{c.name}</td>
                  <td style={s.td}>{c.grade}</td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(c)} style={s.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(c.id, c.name)} style={{ ...s.deleteBtn, marginLeft: 6 }}>
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
        <Modal title="New Class" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div style={{ ...s.field, marginBottom: 14 }}>
              <label style={s.label}>Class Name</label>
              <input style={s.input} placeholder="e.g. 12A1" value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus />
            </div>
            <div style={{ ...s.field, marginBottom: 20 }}>
              <label style={s.label}>Grade</label>
              <input style={s.input} placeholder="e.g. Grade 12" value={newGrade} onChange={(e) => setNewGrade(e.target.value)} required />
            </div>
            <button type="submit" style={s.btn} disabled={creating}>
              {creating ? 'Creating…' : 'Create Class'}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editItem && (
        <Modal title={`Edit Class #${editItem.id}`} onClose={() => setEditItem(null)}>
          <form onSubmit={handleUpdate}>
            <div style={{ ...s.field, marginBottom: 14 }}>
              <label style={s.label}>Class Name</label>
              <input style={s.input} value={editName} onChange={(e) => setEditName(e.target.value)} required autoFocus />
            </div>
            <div style={{ ...s.field, marginBottom: 20 }}>
              <label style={s.label}>Grade</label>
              <input style={s.input} value={editGrade} onChange={(e) => setEditGrade(e.target.value)} required />
            </div>
            <button type="submit" style={s.btn} disabled={updating}>
              {updating ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
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
  input:     { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#0f172a', width: '100%', boxSizing: 'border-box' },
};
