const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath = path.resolve(__dirname, 'data/prayer_time.db');
if (!fs.existsSync(dbPath)) {
  dbPath = path.resolve(__dirname, 'prayer_time.db');
}

const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('=== টেবিল তালিকা ===');
console.log(tables.map(t => t.name));

for (const t of tables) {
  const row = db.prepare(`SELECT * FROM ${t.name} LIMIT 1`).get();
  console.log(`\n=== '${t.name}' টেবিলের সব কলামের তালিকা ===`);
  console.log(row ? Object.keys(row) : 'খালি টেবিল');
}