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
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{d.className}</div>
      <div style={{ color: '#64748b', marginBottom: 2 }}>{d.grade}</div>
      <div style={{ color: rateColor(d.completionRate), fontWeight: 600, fontSize: 15 }}>{d.completionRate}% completion</div>
      <div style={{ color: '#475569', marginTop: 4 }}>{d.studentsCompleted} / {d.totalStudents} students</div>
      <div style={{ color: '#475569' }}>{d.totalSubmissions} submissions · {d.totalPoints} pts</div>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <h1 style={{ fontSize: 20 }}>Class Stats</h1>
        <button onClick={load} style={s.refreshBtn} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>
        Week: {getWeekRange()}
      </p>

      {error && <div style={s.errorBox}>{error}</div>}

      {!loading && stats.length === 0 && !error && (
        <p style={{ color: '#94a3b8' }}>No class data available.</p>
      )}

      {/* Bar chart */}
      {stats.length > 0 && (
        <div style={{ ...s.card, marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 20 }}>
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
          <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
            {[{ label: '≥ 80% (Good)', color: '#22c55e' }, { label: '50–79% (OK)', color: '#eab308' }, { label: '< 50% (Low)', color: '#ef4444' }].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail table */}
      {stats.length > 0 && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Class</th>
                <th style={s.th}>Grade</th>
                <th style={s.th}>Students</th>
                <th style={s.th}>Completed</th>
                <th style={s.th}>Rate</th>
                <th style={s.th}>Submissions</th>
                <th style={s.th}>Points</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.classId} style={s.tr}>
                  <td style={{ ...s.td, fontWeight: 500 }}>{row.className}</td>
                  <td style={s.td}>{row.grade}</td>
                  <td style={s.td}>{row.totalStudents}</td>
                  <td style={s.td}>{row.studentsCompleted}</td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: rateColor(row.completionRate), minWidth: 38 }}>
                        {row.completionRate}%
                      </span>
                      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', minWidth: 80 }}>
                        <div style={{
                          height: '100%', width: `${row.completionRate}%`,
                          background: rateColor(row.completionRate), borderRadius: 3,
                        }} />
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>{row.totalSubmissions}</td>
                  <td style={s.td}>{row.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  refreshBtn: { padding: '6px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#374151' },
  errorBox:   { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  card:       { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' },
  tableWrap:  { background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' },
  table:      { borderCollapse: 'collapse', width: '100%' },
  thead:      { background: '#f8fafc' },
  th:         { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr:         { borderBottom: '1px solid #f1f5f9' },
  td:         { padding: '12px 14px', fontSize: 13, verticalAlign: 'middle' },
};
