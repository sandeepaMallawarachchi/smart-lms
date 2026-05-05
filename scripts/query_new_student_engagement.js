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
    .find({ studentIdNumber: { $in: STUDENT_IDS } }, { projection: { name: 1, studentIdNumber: 1 } })
    .toArray();

  const studentIdMap = new Map(students.map((s) => [String(s._id), s]));
  const progressCourses = new Map();
  const courseNames = new Map(
    (
      await db
        .collection('courses')
        .find({}, { projection: { courseName: 1 } })
        .toArray()
    ).map((c) => [String(c._id), c.courseName])
  );
  const projectCourse = new Map(
    (
      await db
        .collection('projects')
        .find({}, { projection: { courseId: 1 } })
        .toArray()
    ).map((p) => [String(p._id), p.courseId])
  );
  const taskCourse = new Map(
    (
      await db
        .collection('tasks')
        .find({}, { projection: { courseId: 1 } })
        .toArray()
    ).map((t) => [String(t._id), t.courseId])
  );

  const [projectProgress, taskProgress] = await Promise.all([
    db.collection('studentprojectprogresses').find({ studentId: { $in: [...studentIdMap.keys()] } }).toArray(),
    db.collection('studenttaskprogresses').find({ studentId: { $in: [...studentIdMap.keys()] } }).toArray(),
  ]);

  for (const row of projectProgress) {
    const courseId = projectCourse.get(row.projectId);
    if (!courseId) continue;
    const set = progressCourses.get(row.studentId) || new Set();
    set.add(courseId);
    progressCourses.set(row.studentId, set);
  }

  for (const row of taskProgress) {
    const courseId = taskCourse.get(row.taskId);
    if (!courseId) continue;
    const set = progressCourses.get(row.studentId) || new Set();
    set.add(courseId);
    progressCourses.set(row.studentId, set);
  }

  const result = students.map((student) => {
    const set = progressCourses.get(String(student._id)) || new Set();
    return {
      studentIdNumber: student.studentIdNumber,
      name: student.name,
      engagedSubjectCount: set.size,
      subjects: [...set].map((courseId) => courseNames.get(courseId) || courseId),
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
