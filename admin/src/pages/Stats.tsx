import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { statsApi } from '../services/api';
import type { ClassStat } from '../services/api';

function getWeekRange(): string {
  const now = new Date();
  const dow = now.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function rateColor(rate: number) {
  if (rate >= 80) return '#22c55e';
  if (rate >= 50) return '#eab308';
  return '#ef4444';
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: ClassStat;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] shadow-[0_4px_12px_rgba(0,0,0,.1)]">
      <div className="mb-1.5 font-bold">{d.className}</div>
      <div className="mb-0.5 text-slate-500">{d.grade}</div>
      <div className="text-[15px] font-semibold" style={{ color: rateColor(d.completionRate) }}>
        {d.completionRate}% completion
      </div>
      <div className="mt-1 text-slate-600">{d.studentsCompleted} / {d.totalStudents} students</div>
      <div className="text-slate-600">{d.totalSubmissions} submissions · {d.totalPoints} pts</div>
    </div>
  );
}

export function StatsPage() {
  const [stats,   setStats]   = useState<ClassStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    statsApi.get()
      .then(setStats)
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const chartData = stats.map((r) => ({
    ...r,
    name: r.className,
  }));

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-3.5">
        <h1 className="text-xl">Class Stats</h1>
        <button onClick={load} className="min-h-11 rounded-md border border-slate-200 bg-slate-100 px-3.5 text-[13px] text-slate-700 disabled:opacity-70" disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>
      <p className="mb-7 text-[13px] text-slate-500">
        Week: {getWeekRange()}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {!loading && stats.length === 0 && !error && (
        <p className="text-slate-400">No class data available.</p>
      )}

      {/* Bar chart */}
      {stats.length > 0 && (
        <div className="mb-6 rounded-[10px] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-5 text-sm font-bold text-slate-700">
            Completion Rate by Class (%)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,135,255,0.06)' }} />
              <Bar dataKey="completionRate" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={rateColor(entry.completionRate)} />
                ))}
                <LabelList
                  dataKey="completionRate"
                  position="top"
                  formatter={(v: string | number | boolean | null | undefined) => v != null ? `${v}%` : ''}
                  style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap justify-center gap-3 sm:gap-5">
            {[{ label: '≥ 80% (Good)', color: '#22c55e' }, { label: '50–79% (OK)', color: '#eab308' }, { label: '< 50% (Low)', color: '#ef4444' }].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail table */}
      {stats.length > 0 && (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {stats.map((row) => (
              <div key={row.classId} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{row.className}</div>
                    <div className="text-xs text-slate-500">{row.grade}</div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: rateColor(row.completionRate) }}>
                    {row.completionRate}%
                  </span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.completionRate}%`, background: rateColor(row.completionRate) }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-500">
                  <div>Students: <span className="font-medium text-slate-900">{row.totalStudents}</span></div>
                  <div>Completed: <span className="font-medium text-slate-900">{row.studentsCompleted}</span></div>
                  <div>Submissions: <span className="font-medium text-slate-900">{row.totalSubmissions}</span></div>
                  <div>Points: <span className="font-medium text-slate-900">{row.totalPoints}</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-[10px] bg-white shadow-sm md:block">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Class</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Grade</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Students</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Completed</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Rate</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Submissions</th>
                  <th className="border-b border-slate-200 px-3.5 py-[11px] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Points</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row) => (
                  <tr key={row.classId} className="border-b border-slate-100">
                    <td className="px-3.5 py-3 text-sm font-medium">{row.className}</td>
                    <td className="px-3.5 py-3 text-sm">{row.grade}</td>
                    <td className="px-3.5 py-3 text-sm">{row.totalStudents}</td>
                    <td className="px-3.5 py-3 text-sm">{row.studentsCompleted}</td>
                    <td className="px-3.5 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="min-w-[38px] text-[13px] font-bold" style={{ color: rateColor(row.completionRate) }}>
                          {row.completionRate}%
                        </span>
                        <div className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${row.completionRate}%`, background: rateColor(row.completionRate) }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-sm">{row.totalSubmissions}</td>
                    <td className="px-3.5 py-3 text-sm">{row.totalPoints}</td>
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
