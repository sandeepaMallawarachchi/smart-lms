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

function minDate(values) {
  if (!values.length) return null;
  return new Date(Math.min(...values.map((value) => new Date(value).getTime()))).toISOString();
}

function maxDate(values) {
  if (!values.length) return null;
  return new Date(Math.max(...values.map((value) => new Date(value).getTime()))).toISOString();
}

async function main() {
  loadEnvFile(path.join(process.cwd(), 'frontend/.env'));
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'test' });
  const db = mongoose.connection.db;

  const students = await db
    .collection('students')
    .find(
      { studentIdNumber: { $in: STUDENT_IDS } },
      { projection: { name: 1, studentIdNumber: 1, createdAt: 1, updatedAt: 1 } }
    )
    .toArray();

  const studentMap = new Map(students.map((student) => [String(student._id), student]));
  const ids = [...studentMap.keys()];

  const [projects, tasks, predictions] = await Promise.all([
    db.collection('studentprojectprogresses').find({ studentId: { $in: ids } }, { projection: { studentId: 1, updatedAt: 1 } }).toArray(),
    db.collection('studenttaskprogresses').find({ studentId: { $in: ids } }, { projection: { studentId: 1, updatedAt: 1 } }).toArray(),
    db.collection('predictions').find({ studentId: { $in: students.map((student) => student._id) } }, { projection: { studentId: 1, createdAt: 1 } }).toArray(),
  ]);

  const grouped = new Map();
  for (const student of students) {
    grouped.set(String(student._id), { projects: [], tasks: [], predictions: [] });
  }

  for (const row of projects) grouped.get(row.studentId)?.projects.push(row.updatedAt);
  for (const row of tasks) grouped.get(row.studentId)?.tasks.push(row.updatedAt);
  for (const row of predictions) grouped.get(String(row.studentId))?.predictions.push(row.createdAt);

  const result = students.map((student) => {
    const bucket = grouped.get(String(student._id));
    return {
      studentIdNumber: student.studentIdNumber,
      name: student.name,
      accountCreatedAt: student.createdAt,
      projectActivityRange: [minDate(bucket.projects), maxDate(bucket.projects)],
      taskActivityRange: [minDate(bucket.tasks), maxDate(bucket.tasks)],
      predictionRange: [minDate(bucket.predictions), maxDate(bucket.predictions)],
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
