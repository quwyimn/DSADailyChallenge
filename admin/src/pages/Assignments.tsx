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
      <h1 className="mb-6 text-[22px]">Assignments</h1>

      {error && <p className="mb-3 block text-[13px] text-red-500">{error}</p>}

      {/* Date picker */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-semibold text-slate-600">Date</label>
          <input
            type="date"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm sm:w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Assign form */}
      <form onSubmit={handleAssign} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm sm:min-w-[280px] sm:flex-1"
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
        <button type="submit" className="min-h-11 w-full rounded-lg bg-[#4f87ff] px-[22px] py-2.5 text-sm font-semibold text-white disabled:opacity-70 sm:w-auto" disabled={assigning || !selectedTaskId}>
          {assigning ? 'Assigning…' : `Assign to ${date}`}
        </button>
      </form>

      {/* Assignments list */}
      {loadingAsgn ? (
        <p>Loading…</p>
      ) : assignments.length === 0 ? (
        <p className="mt-4 text-slate-500">No tasks assigned on {date}.</p>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {assignments.map((a) => (
              <div key={a.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <code className="text-xs">{a.task.type}</code>
                  <span className="text-xs text-slate-400">{fmtDate(a.date)}</span>
                </div>
                <div className="mb-3 text-sm font-medium">{a.task.title}</div>
                <button onClick={() => handleRemove(a.id)} className="min-h-11 w-full rounded-md border border-red-300 text-xs font-medium text-red-500">
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-lg bg-white shadow-sm md:block">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-xs font-bold text-slate-500">ID</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-xs font-bold text-slate-500">Date</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-xs font-bold text-slate-500">Task type</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-xs font-bold text-slate-500">Task title</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-xs font-bold text-slate-500" />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="px-3.5 py-3 text-sm">{a.id}</td>
                    <td className="px-3.5 py-3 text-sm">{fmtDate(a.date)}</td>
                    <td className="px-3.5 py-3 text-sm"><code>{a.task.type}</code></td>
                    <td className="px-3.5 py-3 text-sm">{a.task.title}</td>
                    <td className="px-3.5 py-3">
                      <button onClick={() => handleRemove(a.id)} className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-500">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
