const { getDb } = require('./schema');

const TOPICS = [
  { number: 1,  title: 'Fall Protection Basics — Your Harness Is Your Life',       category: 'Fall Protection' },
  { number: 2,  title: 'Fall Protection — Roof Anchors and Tie-Off Points',        category: 'Fall Protection' },
  { number: 3,  title: 'Fall Protection — Warning Lines, Guardrails & Covers',     category: 'Fall Protection' },
  { number: 4,  title: 'Ladder Safety — Setting Up and Climbing Safely',           category: 'Ladder Safety' },
  { number: 5,  title: 'Ladder Safety — Extension Ladders on Roofing Jobs',       category: 'Ladder Safety' },
  { number: 6,  title: 'Ladder Safety — Inspecting and Maintaining Ladders',      category: 'Ladder Safety' },
  { number: 7,  title: 'Heat Illness Prevention — Know the Signs',                 category: 'Heat Illness Prevention' },
  { number: 8,  title: 'Heat Illness Prevention — Hydration and Rest Breaks',     category: 'Heat Illness Prevention' },
  { number: 9,  title: 'Heat Illness Prevention — Employer Obligations (Cal/OSHA)',category: 'Heat Illness Prevention' },
  { number: 10, title: 'Hot Work & Tar Kettles — Fire Safety and Burns',           category: 'Hot Work & Tar Kettles' },
  { number: 11, title: 'Hot Work & Tar Kettles — Safe Kettle Operation',           category: 'Hot Work & Tar Kettles' },
  { number: 12, title: 'Hot Work & Tar Kettles — Spill Response and PPE',         category: 'Hot Work & Tar Kettles' },
  { number: 13, title: 'PPE Selection & Use — Choosing the Right Equipment',      category: 'PPE' },
  { number: 14, title: 'PPE Selection & Use — Head, Eye, and Foot Protection',    category: 'PPE' },
  { number: 15, title: 'PPE Selection & Use — Gloves and Hand Safety',            category: 'PPE' },
  { number: 16, title: 'Emergency Procedures — What to Do When Someone Is Hurt',  category: 'Emergency Procedures' },
  { number: 17, title: 'Emergency Procedures — Fire and Evacuation Plans',        category: 'Emergency Procedures' },
  { number: 18, title: 'Emergency Procedures — Reporting Incidents to Cal/OSHA',  category: 'Emergency Procedures' },
  { number: 19, title: 'Housekeeping & Site Safety — Clean Sites Are Safe Sites', category: 'Housekeeping & Site Safety' },
  { number: 20, title: 'Housekeeping & Site Safety — Debris and Material Storage',category: 'Housekeeping & Site Safety' },
  { number: 21, title: 'Housekeeping & Site Safety — Preventing Slip and Trip Hazards', category: 'Housekeeping & Site Safety' },
  { number: 22, title: 'Electrical Safety — Overhead Lines and Job Site Hazards', category: 'Electrical Safety' },
  { number: 23, title: 'Electrical Safety — Power Tools and GFCIs',               category: 'Electrical Safety' },
  { number: 24, title: 'Electrical Safety — Lockout/Tagout Basics',               category: 'Electrical Safety' },
  { number: 25, title: 'Scaffold Safety — Erection and Inspection',               category: 'Scaffold Safety' },
  { number: 26, title: 'Scaffold Safety — Safe Use and Load Limits',              category: 'Scaffold Safety' },
  { number: 27, title: 'Scaffold Safety — Cal/OSHA Requirements',                 category: 'Scaffold Safety' },
  { number: 28, title: 'Silica Dust & Respiratory — Understanding the Risk',      category: 'Silica & Respiratory' },
  { number: 29, title: 'Silica Dust & Respiratory — Respiratory Protection',      category: 'Silica & Respiratory' },
  { number: 30, title: 'Silica Dust & Respiratory — Exposure Limits and Monitoring', category: 'Silica & Respiratory' },
];

function seedTopics() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM toolbox_topics').get().count;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO toolbox_topics (topic_number, title, category, filename)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((topics) => {
    for (const t of topics) {
      const filename = `Talk_${String(t.number).padStart(2, '0')}_${t.category.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      insert.run(t.number, t.title, t.category, filename);
    }
  });

  insertMany(TOPICS);
  console.log(`✅ Seeded ${TOPICS.length} toolbox topics`);
}

module.exports = { seedTopics };
