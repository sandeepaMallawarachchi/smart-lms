const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const frontendRequire = createRequire(path.join(process.cwd(), 'frontend/package.json'));
const mongoose = frontendRequire('mongoose');

const LECTURER_EMAILS = [
  'nuwan.jayasekara@smartlms.edu',
  'tharindi.peris@smartlms.edu',
  'ashen.wijeratne@smartlms.edu',
];

const STUDENT_IDS = ['it25110011', 'it24120015', 'it23130012'];

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

  const lecturers = await db
    .collection('lecturers')
    .find({ email: { $in: LECTURER_EMAILS } }, { projection: { name: 1, email: 1 } })
    .toArray();

  const lecturerReport = [];
  for (const lecturer of lecturers) {
    const courses = await db
      .collection('courses')
      .find({
        $or: [{ lecturerInCharge: lecturer._id }, { lecturers: lecturer._id }],
        isArchived: false,
      })
      .project({ courseName: 1, year: 1, semester: 1 })
      .toArray();
    lecturerReport.push({
      lecturer: lecturer.email,
      lecturerId: String(lecturer._id),
      courseCount: courses.length,
      courses,
    });
  }

  const predictions = await db
    .collection('predictions')
    .find({ studentIdNumber: { $in: STUDENT_IDS } }, { projection: { studentIdNumber: 1, studentId: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(12)
    .toArray();

  console.log(
    JSON.stringify(
      {
        lecturers: lecturerReport,
        predictionStudentIdTypes: predictions.map((row) => ({
          studentIdNumber: row.studentIdNumber,
          studentIdValue: row.studentId,
          studentIdBsonType:
            row.studentId && typeof row.studentId === 'object' && row.studentId._bsontype
              ? row.studentId._bsontype
              : typeof row.studentId,
        })),
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
