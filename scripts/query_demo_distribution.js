const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const frontendRequire = createRequire(path.join(process.cwd(), 'frontend/package.json'));
const mongoose = frontendRequire('mongoose');

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

  const [courses, studentsByYear, lecturers, students] = await Promise.all([
    db
      .collection('courses')
      .find(
        {},
        {
          projection: {
            courseName: 1,
            year: 1,
            semester: 1,
            specializations: 1,
            lecturerInCharge: 1,
            lecturers: 1,
            isArchived: 1,
          },
        }
      )
      .toArray(),
    db
      .collection('students')
      .aggregate([{ $group: { _id: '$academicYear', count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
      .toArray(),
    db
      .collection('lecturers')
      .find({}, { projection: { name: 1, email: 1, position: 1, isVerified: 1 } })
      .toArray(),
    db.collection('students').countDocuments(),
  ]);

  console.log(
    JSON.stringify(
      {
        studentCount: students,
        lecturerCount: lecturers.length,
        studentsByYear,
        lecturers,
        courses,
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
