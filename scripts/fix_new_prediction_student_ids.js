const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const frontendRequire = createRequire(path.join(process.cwd(), 'frontend/package.json'));
const mongoose = frontendRequire('mongoose');

const STUDENT_IDS = [
  'it25110011',
  'it25110027',
  'it25110034',
  'it25110042',
  'it24120015',
  'it24120022',
  'it24120031',
  'it24120044',
  'it23130012',
  'it22140019',
];

function loadEnvFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), 'frontend/.env'));
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'test' });
  const db = mongoose.connection.db;

  const students = await db
    .collection('students')
    .find({ studentIdNumber: { $in: STUDENT_IDS } }, { projection: { studentIdNumber: 1 } })
    .toArray();

  let modified = 0;
  for (const student of students) {
    const result = await db.collection('predictions').updateMany(
      { studentId: student._id },
      { $set: { studentId: String(student._id) } }
    );
    modified += result.modifiedCount;
  }

  console.log(JSON.stringify({ studentsFound: students.length, predictionsUpdated: modified }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
