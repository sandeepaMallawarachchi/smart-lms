const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const frontendRequire = createRequire(path.join(process.cwd(), 'frontend/package.json'));
const mongoose = frontendRequire('mongoose');

const LOW_RISK_STUDENT_IDS = [
  'it25110011', // Nethmi Perera
  'it25110034', // Dilan Fernando
  'it24120015', // Tharushi Madushani
  'it24120031', // Dilsha Weerasinghe
  'it23130012', // Pabasara Hettiarachchi
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

function daysAgo(days, hour = 10, minute = 0) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - days);
  now.setUTCHours(hour, minute, 0, 0);
  return new Date(now);
}

function markProjectTasks(mainTasks = [], status) {
  return mainTasks.map((task, taskIndex) => {
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    const updatedSubtasks = subtasks.map((subtask, subtaskIndex) => {
      const completed =
        status === 'done' ? true : subtaskIndex === 0 || (taskIndex === 0 && subtaskIndex === 1);
      return {
        ...subtask,
        completed,
      };
    });

    const completed =
      status === 'done' ||
      (updatedSubtasks.length > 0 && updatedSubtasks.every((subtask) => subtask.completed)) ||
      (updatedSubtasks.length === 0 && taskIndex === 0);

    return {
      ...task,
      completed,
      subtasks: updatedSubtasks,
    };
  });
}

function markTaskSubtasks(subtasks = [], status) {
  return subtasks.map((subtask, index) => ({
    ...subtask,
    completed: status === 'done' ? true : index < Math.max(1, Math.ceil(subtasks.length / 2)),
  }));
}

async function main() {
  loadEnvFile(path.join(process.cwd(), 'frontend/.env'));
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'test' });
  const db = mongoose.connection.db;

  const students = await db
    .collection('students')
    .find(
      { studentIdNumber: { $in: LOW_RISK_STUDENT_IDS } },
      { projection: { _id: 1, studentIdNumber: 1, name: 1 } }
    )
    .toArray();

  const summary = [];

  for (const student of students) {
    const studentId = String(student._id);

    const [projectProgress, taskProgress] = await Promise.all([
      db
        .collection('studentprojectprogresses')
        .find({ studentId })
        .sort({ updatedAt: 1 })
        .toArray(),
      db
        .collection('studenttaskprogresses')
        .find({ studentId })
        .sort({ updatedAt: 1 })
        .toArray(),
    ]);

    let projectUpdates = 0;
    let taskUpdates = 0;

    for (let i = 0; i < projectProgress.length; i += 1) {
      const progress = projectProgress[i];
      const status = i === projectProgress.length - 1 ? 'inprogress' : 'done';
      const updatedAt = daysAgo(18 - i * 5, 9 + (i % 3), 20);
      const createdAt = new Date(updatedAt.getTime() - 2 * 24 * 60 * 60 * 1000);

      await db.collection('studentprojectprogresses').updateOne(
        { _id: progress._id },
        {
          $set: {
            status,
            mainTasks: markProjectTasks(progress.mainTasks || [], status),
            createdAt,
            updatedAt,
          },
        }
      );
      projectUpdates += 1;
    }

    for (let i = 0; i < taskProgress.length; i += 1) {
      const progress = taskProgress[i];
      const status = i % 4 === 3 ? 'inprogress' : 'done';
      const updatedAt = daysAgo(24 - i * 2, 10 + (i % 4), 15);
      const createdAt = new Date(updatedAt.getTime() - 24 * 60 * 60 * 1000);

      await db.collection('studenttaskprogresses').updateOne(
        { _id: progress._id },
        {
          $set: {
            status,
            subtasks: markTaskSubtasks(progress.subtasks || [], status),
            createdAt,
            updatedAt,
          },
        }
      );
      taskUpdates += 1;
    }

    summary.push({
      studentIdNumber: student.studentIdNumber,
      name: student.name,
      projectUpdates,
      taskUpdates,
    });
  }

  console.log(JSON.stringify({ updatedStudents: summary }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
