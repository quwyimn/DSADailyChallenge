require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg(process.env['DATABASE_URL']);
const prisma = new PrismaClient({ adapter });

function getHcmToday() {
  const hcmMs = Date.now() + 7 * 60 * 60 * 1000;
  const d = new Date(hcmMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return new Date(`${y}-${m}-${day}T00:00:00.000Z`);
}

(async () => {
  const today = getHcmToday();
  console.log('getHcmToday():', today.toISOString());
  console.log('new Date()   :', new Date().toISOString());

  const all = await prisma.dailyAssignment.findMany({
    include: { task: { select: { type: true, difficulty: true, title: true } } },
    orderBy: { date: 'desc' },
  });
  console.log('\nAll daily_assignments rows (most recent dates):');
  const byDate = new Map();
  for (const a of all) {
    const key = a.date.toISOString();
    const list = byDate.get(key) || [];
    list.push(`${a.task.type}:${a.task.difficulty} (task ${a.taskId})`);
    byDate.set(key, list);
  }
  for (const [date, items] of byDate) {
    console.log(`  ${date}  (${items.length} rows): ${items.join(', ')}`);
  }
  await prisma.$disconnect();
})();
