const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const frontendRequire = createRequire(path.join(process.cwd(), 'frontend/package.json'));
const mongoose = frontendRequire('mongoose');
const bcrypt = frontendRequire('bcryptjs');

const { ObjectId } = mongoose.Types;

const DB_NAME = process.env.MONGO_DB_NAME || 'test';
const DEFAULT_PASSWORD = 'SmartLMS@123';

const NEW_LECTURERS = [
  {
    name: 'Dr. Nuwan Jayasekara',
    email: 'nuwan.jayasekara@smartlms.edu',
    gender: 'male',
    dateOfBirth: '1984-02-16',
    position: 'lecture',
  },
  {
    name: 'Ms. Tharindi Peris',
    email: 'tharindi.peris@smartlms.edu',
    gender: 'female',
    dateOfBirth: '1989-07-28',
    position: 'lic',
  },
  {
    name: 'Mr. Ashen Wijeratne',
    email: 'ashen.wijeratne@smartlms.edu',
    gender: 'male',
    dateOfBirth: '1991-11-09',
    position: 'instructure',
  },
];

const NEW_COURSES = [
  {
    key: 'year1_web',
    courseName: 'Web Development Fundamentals',
    year: 1,
    semester: 1,
    specializations: ['SE', 'IT', 'DS', 'CSNE', 'CS', 'IM'],
    lecturerKey: 'nuwan.jayasekara@smartlms.edu',
  },
  {
    key: 'year1_systems',
    courseName: 'Computer Systems Essentials',
    year: 1,
    semester: 1,
    specializations: ['SE', 'IT', 'DS', 'CSNE', 'CS', 'IM'],
    lecturerKey: 'tharindi.peris@smartlms.edu',
  },
  {
    key: 'year2_dsa',
    courseName: 'Data Structures and Algorithms',
    year: 2,
    semester: 1,
    specializations: ['SE', 'IT', 'DS', 'CSNE', 'CS', 'IM'],
    lecturerKey: 'nuwan.jayasekara@smartlms.edu',
  },
  {
    key: 'year2_oop',
    courseName: 'Object-Oriented Programming',
    year: 2,
    semester: 1,
    specializations: ['SE', 'IT', 'DS', 'CSNE', 'CS', 'IM'],
    lecturerKey: 'ashen.wijeratne@smartlms.edu',
  },
  {
    key: 'year2_db',
    courseName: 'Database Management Systems',
    year: 2,
    semester: 1,
    specializations: ['SE', 'IT', 'DS', 'CSNE', 'CS', 'IM'],
    lecturerKey: 'tharindi.peris@smartlms.edu',
  },
  {
    key: 'year3_sed',
    courseName: 'Software Engineering and Design',
    year: 3,
    semester: 1,
    specializations: ['SE', 'IT', 'DS', 'CS'],
    lecturerKey: 'nuwan.jayasekara@smartlms.edu',
  },
  {
    key: 'year3_cloud',
    courseName: 'Cloud Application Development',
    year: 3,
    semester: 1,
    specializations: ['SE', 'IT', 'DS', 'CS'],
    lecturerKey: 'ashen.wijeratne@smartlms.edu',
  },
  {
    key: 'year4_devops',
    courseName: 'DevOps and Release Engineering',
    year: 4,
    semester: 1,
    specializations: ['SE', 'CSNE'],
    lecturerKey: 'tharindi.peris@smartlms.edu',
  },
];

const NEW_STUDENTS = [
  {
    studentIdNumber: 'it25110011',
    name: 'Nethmi Perera',
    email: 'it25110011@my.sliit.lk',
    gender: 'female',
    dateOfBirth: '2005-03-18',
    address: 'Kandy, Sri Lanka',
    nicNumber: '200578901234',
    academicYear: '1',
    semester: '1',
    specialization: 'SE',
    band: 'good',
    engagedCourseKeys: ['year1_intro', 'year1_web'],
    historyStartDaysAgo: 78,
    latestActivityDaysAgo: 19,
  },
  {
    studentIdNumber: 'it25110027',
    name: 'Kavindu Senanayake',
    email: 'it25110027@my.sliit.lk',
    gender: 'male',
    dateOfBirth: '2005-08-04',
    address: 'Gampaha, Sri Lanka',
    nicNumber: '200582211245',
    academicYear: '1',
    semester: '1',
    specialization: 'IT',
    band: 'normal',
    engagedCourseKeys: ['year1_intro', 'year1_web', 'year1_systems'],
    historyStartDaysAgo: 72,
    latestActivityDaysAgo: 24,
  },
  {
    studentIdNumber: 'it25110034',
    name: 'Dilan Fernando',
    email: 'it25110034@my.sliit.lk',
    gender: 'male',
    dateOfBirth: '2005-10-12',
    address: 'Kurunegala, Sri Lanka',
    nicNumber: '200584301256',
    academicYear: '1',
    semester: '1',
    specialization: 'CS',
    band: 'very_good',
    engagedCourseKeys: ['year1_intro', 'year1_systems'],
    historyStartDaysAgo: 84,
    latestActivityDaysAgo: 21,
  },
  {
    studentIdNumber: 'it25110042',
    name: 'Yasas Wickramasinghe',
    email: 'it25110042@my.sliit.lk',
    gender: 'male',
    dateOfBirth: '2005-01-29',
    address: 'Colombo, Sri Lanka',
    nicNumber: '200576541267',
    academicYear: '1',
    semester: '1',
    specialization: 'DS',
    band: 'bad',
    engagedCourseKeys: ['year1_intro', 'year1_web'],
    historyStartDaysAgo: 66,
    latestActivityDaysAgo: 26,
  },
  {
    studentIdNumber: 'it24120015',
    name: 'Tharushi Madushani',
    email: 'it24120015@my.sliit.lk',
    gender: 'female',
    dateOfBirth: '2004-09-07',
    address: 'Matara, Sri Lanka',
    nicNumber: '200476781278',
    academicYear: '2',
    semester: '1',
    specialization: 'SE',
    band: 'good',
    engagedCourseKeys: ['year2_dsa', 'year2_oop'],
    historyStartDaysAgo: 75,
    latestActivityDaysAgo: 20,
  },
  {
    studentIdNumber: 'it24120022',
    name: 'Kanishka Rodrigo',
    email: 'it24120022@my.sliit.lk',
    gender: 'male',
    dateOfBirth: '2004-04-21',
    address: 'Negombo, Sri Lanka',
    nicNumber: '200471231289',
    academicYear: '2',
    semester: '1',
    specialization: 'IT',
    band: 'normal',
    engagedCourseKeys: ['year2_dsa', 'year2_db', 'year2_oop'],
    historyStartDaysAgo: 69,
    latestActivityDaysAgo: 23,
  },
  {
    studentIdNumber: 'it24120031',
    name: 'Dilsha Weerasinghe',
    email: 'it24120031@my.sliit.lk',
    gender: 'female',
    dateOfBirth: '2004-11-11',
    address: 'Anuradhapura, Sri Lanka',
    nicNumber: '200486541290',
    academicYear: '2',
    semester: '1',
    specialization: 'DS',
    band: 'very_good',
    engagedCourseKeys: ['year2_db', 'year2_oop'],
    historyStartDaysAgo: 81,
    latestActivityDaysAgo: 18,
  },
  {
    studentIdNumber: 'it24120044',
    name: 'Minura Jayasanka',
    email: 'it24120044@my.sliit.lk',
    gender: 'male',
    dateOfBirth: '2004-06-26',
    address: 'Badulla, Sri Lanka',
    nicNumber: '200474561301',
    academicYear: '2',
    semester: '1',
    specialization: 'CSNE',
    band: 'bad',
    engagedCourseKeys: ['year2_dsa', 'year2_db'],
    historyStartDaysAgo: 63,
    latestActivityDaysAgo: 27,
  },
  {
    studentIdNumber: 'it23130012',
    name: 'Pabasara Hettiarachchi',
    email: 'it23130012@my.sliit.lk',
    gender: 'female',
    dateOfBirth: '2003-12-03',
    address: 'Ratnapura, Sri Lanka',
    nicNumber: '200369871312',
    academicYear: '3',
    semester: '1',
    specialization: 'SE',
    band: 'good',
    engagedCourseKeys: ['year3_deep_learning', 'year3_sed', 'year3_cloud'],
    historyStartDaysAgo: 87,
    latestActivityDaysAgo: 22,
  },
  {
    studentIdNumber: 'it22140019',
    name: 'Hesara De Silva',
    email: 'it22140019@my.sliit.lk',
    gender: 'female',
    dateOfBirth: '2002-05-14',
    address: 'Galle, Sri Lanka',
    nicNumber: '200264321323',
    academicYear: '4',
    semester: '1',
    specialization: 'SE',
    band: 'normal',
    engagedCourseKeys: ['year4_secure', 'year4_robotics', 'year4_devops'],
    historyStartDaysAgo: 58,
    latestActivityDaysAgo: 17,
  },
];

const BAND_PROFILES = {
  very_good: {
    riskCurve: [0.24, 0.19, 0.15, 0.11, 0.08],
    scoreCurve: [76, 81, 85, 88, 91],
    completionCurve: [0.68, 0.78, 0.86, 0.92, 0.96],
    clicksCurve: [1200, 1600, 2100, 2500, 2950],
    lateCurve: [1, 1, 0, 0, 0],
    riskFactors: ['Low academic risk', 'Strong consistency across course work'],
    goalStatuses: ['done', 'inprogress', 'todo'],
    doneRatio: 0.72,
    inprogressRatio: 0.22,
  },
  good: {
    riskCurve: [0.38, 0.31, 0.27, 0.23, 0.18],
    scoreCurve: [64, 69, 73, 77, 81],
    completionCurve: [0.54, 0.62, 0.71, 0.79, 0.86],
    clicksCurve: [950, 1250, 1480, 1760, 2050],
    lateCurve: [2, 2, 1, 1, 0],
    riskFactors: ['A few deadline delays', 'Moderate weekly activity variation'],
    goalStatuses: ['inprogress', 'todo', 'todo'],
    doneRatio: 0.48,
    inprogressRatio: 0.32,
  },
  normal: {
    riskCurve: [0.55, 0.52, 0.49, 0.46, 0.43],
    scoreCurve: [52, 57, 61, 65, 68],
    completionCurve: [0.4, 0.48, 0.55, 0.61, 0.67],
    clicksCurve: [700, 900, 1080, 1270, 1450],
    lateCurve: [4, 3, 3, 2, 2],
    riskFactors: ['Uneven completion rate', 'Assessment scores still fluctuate'],
    goalStatuses: ['todo', 'inprogress', 'todo'],
    doneRatio: 0.3,
    inprogressRatio: 0.34,
  },
  bad: {
    riskCurve: [0.63, 0.67, 0.71, 0.76, 0.81],
    scoreCurve: [54, 50, 47, 43, 39],
    completionCurve: [0.46, 0.41, 0.36, 0.31, 0.26],
    clicksCurve: [900, 760, 620, 520, 430],
    lateCurve: [4, 5, 5, 6, 6],
    riskFactors: ['Multiple overdue items', 'Low sustained engagement'],
    goalStatuses: ['todo', 'inprogress', 'todo'],
    doneRatio: 0.14,
    inprogressRatio: 0.22,
  },
};

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

function utcDate(str) {
  return new Date(`${str}T00:00:00.000Z`);
}

function daysAgo(days, hour = 9) {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function interpolateDays(oldestDaysAgo, latestDaysAgo, totalPoints, index) {
  if (totalPoints <= 1) return oldestDaysAgo;
  const span = oldestDaysAgo - latestDaysAgo;
  const step = span / (totalPoints - 1);
  return Math.round(oldestDaysAgo - step * index);
}

function cloneMainTasks(mainTasks, status) {
  return mainTasks.map((task, taskIndex) => {
    const subtasks = (task.subtasks || []).map((subtask, subtaskIndex) => {
      const completed = status === 'done' || (status === 'inprogress' && subtaskIndex === 0);
      return {
        id: subtask.id || `st-${taskIndex + 1}-${subtaskIndex + 1}`,
        title: subtask.title,
        description: subtask.description || '',
        marks: subtask.marks || 0,
        completed,
      };
    });

    return {
      id: task.id || `mt-${taskIndex + 1}`,
      title: task.title,
      description: task.description || '',
      marks: task.marks || 0,
      completed: status === 'done' || (status === 'inprogress' && subtasks.every((item) => item.completed)),
      subtasks,
    };
  });
}

function cloneSubtasks(subtasks, status) {
  return (subtasks || []).map((subtask, index) => ({
    id: subtask.id || `st-${index + 1}`,
    title: subtask.title,
    description: subtask.description || '',
    marks: subtask.marks || 0,
    completed: status === 'done' || (status === 'inprogress' && index === 0),
  }));
}

function predictionDocs(student, engagedCourseCount) {
  const profile = BAND_PROFILES[student.band];
  return profile.riskCurve.map((riskProbability, index) => {
    const score = profile.scoreCurve[index];
    const completion = profile.completionCurve[index];
    const clicks = profile.clicksCurve[index];
    const late = profile.lateCurve[index];
    const createdAt = daysAgo(
      interpolateDays(student.historyStartDaysAgo, student.latestActivityDaysAgo, profile.riskCurve.length, index),
      10
    );
    const riskLevel = riskProbability >= 0.7 ? 'high' : riskProbability >= 0.4 ? 'medium' : 'low';

    return {
      studentId: String(student._id),
      studentIdNumber: student.studentIdNumber,
      inputData: {
        total_clicks: clicks,
        avg_clicks_per_day: Number((clicks / 60).toFixed(2)),
        clicks_std: Number((clicks * 0.12).toFixed(2)),
        max_clicks_single_day: Math.max(8, Math.round(clicks / 14)),
        days_active: Math.max(12, Math.round(18 + completion * 25)),
        study_span_days: 70 + index * 5,
        engagement_regularity: Number((1.2 + (1 - completion) * 2.1).toFixed(2)),
        pre_course_clicks: Math.round(clicks * 0.05),
        avg_score: score,
        score_std: Number((6 + (1 - completion) * 10).toFixed(2)),
        min_score: Math.max(20, score - 18),
        max_score: Math.min(100, score + 12),
        completion_rate: completion,
        first_score: Math.max(20, score - 6),
        score_improvement: Number((index * 1.4 - (student.band === 'bad' ? 3 : 0)).toFixed(1)),
        avg_days_early: Number((2.4 - late * 0.8).toFixed(2)),
        timing_consistency: Number((2.1 + late * 0.6).toFixed(2)),
        worst_delay: late > 0 ? -late : 2,
        late_submission_count: late,
        num_of_prev_attempts: student.band === 'bad' ? 2 : student.band === 'normal' ? 1 : 0,
        studied_credits: engagedCourseCount * 3,
        early_registration: student.band === 'bad' ? 0 : 1,
        withdrew: 0,
        gender: student.gender === 'female' ? 'F' : student.gender === 'male' ? 'M' : 'O',
        age_band: '0-35',
        highest_education: 'A Level or Equivalent',
        disability: 'N',
      },
      prediction: {
        at_risk: riskLevel !== 'low',
        confidence: Number(Math.min(0.95, 0.58 + Math.abs(riskProbability - 0.5)).toFixed(3)),
        risk_level: riskLevel,
        risk_probability: riskProbability,
        risk_factors: profile.riskFactors,
      },
      recommendations: {
        explanation:
          student.band === 'very_good'
            ? 'Strong engagement and consistent completion suggest healthy academic momentum.'
            : student.band === 'good'
              ? 'Progress is positive, but better deadline discipline would strengthen results.'
              : student.band === 'normal'
                ? 'The student is progressing, though consistency and completion still need attention.'
                : 'Academic risk remains high because engagement and completion have both declined.',
        motivation:
          student.band === 'bad'
            ? 'Short, repeatable wins will help recover momentum.'
            : 'Steady progress across subjects will improve the overall trend.',
        action_steps: [
          'Review the next active task before the weekend.',
          'Maintain a visible weekly checklist for course work.',
          'Prioritize one high-impact subject session this week.',
        ],
        model: 'seeded-demo-scenario',
        source: 'manual_seed',
        generated_at: createdAt.toISOString(),
      },
      apiTimestamp: createdAt.toISOString(),
      semester: student.semester,
      academicYear: student.academicYear,
      specialization: student.specialization,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function learningGoals(student, engagedCourses) {
  const primaryCourse = engagedCourses[0];
  const secondaryCourse = engagedCourses[1] || engagedCourses[0];
  const statuses = BAND_PROFILES[student.band].goalStatuses;
  const baseDate = daysAgo(Math.max(student.latestActivityDaysAgo + 6, student.historyStartDaysAgo - 10), 11);

  const templates = [
    {
      title: `Stay on track in ${primaryCourse.courseName}`,
      description: `Keep weekly activity steady in ${primaryCourse.courseName} and avoid last-minute work.`,
      category: 'academic',
      priority: 'high',
      status: statuses[0],
      tags: ['coursework', 'consistency', primaryCourse.courseName.toLowerCase()],
    },
    {
      title: `Improve practical confidence in ${secondaryCourse.courseName}`,
      description: `Build confidence by revisiting the practical parts of ${secondaryCourse.courseName} every week.`,
      category: 'skill',
      priority: 'medium',
      status: statuses[1],
      tags: ['practice', 'skills', secondaryCourse.courseName.toLowerCase()],
    },
    {
      title: 'Maintain a sustainable study routine',
      description: 'Use short repeated sessions so progress continues across multiple subjects.',
      category: 'personal',
      priority: 'medium',
      status: statuses[2],
      tags: ['routine', 'planning', 'engagement'],
    },
  ];

  return templates.map((goal, index) => {
    const completed = goal.status === 'done';
    const inProgress = goal.status === 'inprogress';
    const createdAt = new Date(baseDate.getTime() + index * 86400000);
    const targetDate = daysAgo(-14 - index * 7, 9);
    return {
      studentId: student._id,
      title: goal.title,
      description: goal.description,
      category: goal.category,
      targetDate,
      priority: goal.priority,
      status: goal.status,
      progress: completed ? 100 : inProgress ? 50 : 0,
      milestones: [
        {
          id: `m-${index + 1}-1`,
          title: 'Plan the work',
          completed: completed || inProgress,
          completedAt: completed || inProgress ? createdAt : null,
        },
        {
          id: `m-${index + 1}-2`,
          title: 'Execute the weekly task',
          completed,
          completedAt: completed ? new Date(createdAt.getTime() + 3 * 86400000) : null,
        },
      ],
      tags: goal.tags,
      courseId: primaryCourse ? primaryCourse._id : undefined,
      completedAt: completed ? new Date(createdAt.getTime() + 5 * 86400000) : null,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function buildProjectBlueprint(course) {
  return {
    courseId: String(course._id),
    lecturerId: String(course.lecturerInCharge),
    projectName: `${course.courseName} Applied Mini Project`,
    description: {
      html: `<p>Applied project work for ${course.courseName}</p>`,
      text: `Applied project work for ${course.courseName}`,
    },
    projectType: 'individual',
    assignedGroupIds: [],
    deadlineDate: '2026-06-10',
    deadlineTime: '23:59',
    specialNotes: {
      html: '<p>Focus on clean implementation and evidence of progress.</p>',
      text: 'Focus on clean implementation and evidence of progress.',
    },
    templateDocuments: [],
    otherDocuments: [],
    images: [],
    mainTasks: [
      {
        id: 'mt-1',
        title: 'Plan and design',
        description: 'Prepare the design outline and approach.',
        marks: 20,
        subtasks: [
          { id: 'st-1-1', title: 'Define scope', marks: 10 },
          { id: 'st-1-2', title: 'Prepare design notes', marks: 10 },
        ],
      },
      {
        id: 'mt-2',
        title: 'Implement and validate',
        description: 'Build the solution and capture validation evidence.',
        marks: 30,
        subtasks: [
          { id: 'st-2-1', title: 'Complete implementation', marks: 15 },
          { id: 'st-2-2', title: 'Add test evidence', marks: 15 },
        ],
      },
    ],
    isPublished: true,
  };
}

function buildTaskBlueprints(course) {
  return [
    {
      courseId: String(course._id),
      lecturerId: String(course.lecturerInCharge),
      taskName: `${course.courseName} Weekly Lab`,
      description: {
        html: `<p>Weekly practical work for ${course.courseName}</p>`,
        text: `Weekly practical work for ${course.courseName}`,
      },
      deadlineDate: '2026-05-30',
      deadlineTime: '23:59',
      specialNotes: { html: '', text: '' },
      templateDocuments: [],
      otherDocuments: [],
      images: [],
      subtasks: [
        { id: 't-1', title: 'Complete the practical activity', marks: 10 },
        { id: 't-2', title: 'Upload notes or screenshots', marks: 5 },
      ],
      isPublished: true,
    },
    {
      courseId: String(course._id),
      lecturerId: String(course.lecturerInCharge),
      taskName: `${course.courseName} Concept Check`,
      description: {
        html: `<p>Short concept-focused task for ${course.courseName}</p>`,
        text: `Short concept-focused task for ${course.courseName}`,
      },
      deadlineDate: '2026-06-05',
      deadlineTime: '23:59',
      specialNotes: { html: '', text: '' },
      templateDocuments: [],
      otherDocuments: [],
      images: [],
      subtasks: [
        { id: 't-1', title: 'Answer the concept questions', marks: 8 },
        { id: 't-2', title: 'Review mistakes and resubmit notes', marks: 4 },
      ],
      isPublished: true,
    },
  ];
}

async function upsertLecturers(db) {
  const lecturers = [];
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const lecturer of NEW_LECTURERS) {
    const existing = await db.collection('lecturers').findOne({ email: lecturer.email });
    if (existing) {
      lecturers.push(existing);
      continue;
    }

    const now = new Date();
    const doc = {
      ...lecturer,
      email: lecturer.email.toLowerCase(),
      password: passwordHash,
      userRole: 'lecture',
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection('lecturers').insertOne(doc);
    lecturers.push({ ...doc, _id: result.insertedId });
  }

  return lecturers;
}

async function upsertCourses(db, lecturersByEmail, existingLecturerPool) {
  const courseMap = new Map();

  const existingIntro = await db.collection('courses').findOne({ courseName: 'Introduction to Programming', year: 1, semester: 1 });
  if (existingIntro) courseMap.set('year1_intro', existingIntro);

  const existingDeepLearning = await db.collection('courses').findOne({ courseName: 'Deep Learning', year: 3, semester: 1 });
  if (existingDeepLearning) courseMap.set('year3_deep_learning', existingDeepLearning);

  const existingSecure = await db.collection('courses').findOne({ courseName: 'Secure Software Development', year: 4, semester: 1 });
  if (existingSecure) courseMap.set('year4_secure', existingSecure);

  const existingRobotics = await db.collection('courses').findOne({ courseName: 'Robotics and Intelligence Systems', year: 4, semester: 1 });
  if (existingRobotics) courseMap.set('year4_robotics', existingRobotics);

  for (const course of NEW_COURSES) {
    const lecturer = lecturersByEmail.get(course.lecturerKey);
    const supporting = existingLecturerPool.slice(0, 2).map((item) => item._id);
    const lecturers = [...new Set([lecturer._id.toString(), ...supporting.map((id) => id.toString())])].map((id) => new ObjectId(id));

    const existing = await db.collection('courses').findOne({
      courseName: course.courseName,
      year: course.year,
      semester: course.semester,
    });

    if (existing) {
      await db.collection('courses').updateOne(
        { _id: existing._id },
        {
          $set: {
            specializations: course.specializations,
            lecturerInCharge: lecturer._id,
            lecturers,
            isArchived: false,
            updatedAt: new Date(),
          },
        }
      );
      courseMap.set(course.key, { ...existing, specializations: course.specializations, lecturerInCharge: lecturer._id, lecturers, isArchived: false });
      continue;
    }

    const now = new Date();
    const doc = {
      courseName: course.courseName,
      credits: 3,
      year: course.year,
      semester: course.semester,
      specializations: course.specializations,
      lecturerInCharge: lecturer._id,
      lecturers,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection('courses').insertOne(doc);
    courseMap.set(course.key, { ...doc, _id: result.insertedId });
  }

  return courseMap;
}

async function upsertProjectsAndTasks(db, courseMap) {
  const projectMap = new Map();
  const taskMap = new Map();

  for (const [key, course] of courseMap.entries()) {
    const projectBlueprint = buildProjectBlueprint(course);
    const existingProject = await db.collection('projects').findOne({
      courseId: String(course._id),
      projectName: projectBlueprint.projectName,
    });

    let projectDoc;
    if (existingProject) {
      projectDoc = existingProject;
      await db.collection('projects').updateOne(
        { _id: existingProject._id },
        {
          $set: {
            ...projectBlueprint,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      const now = new Date();
      projectDoc = { ...projectBlueprint, createdAt: now, updatedAt: now };
      const result = await db.collection('projects').insertOne(projectDoc);
      projectDoc._id = result.insertedId;
    }
    projectMap.set(key, projectDoc);

    const tasks = [];
    for (const taskBlueprint of buildTaskBlueprints(course)) {
      const existingTask = await db.collection('tasks').findOne({
        courseId: String(course._id),
        taskName: taskBlueprint.taskName,
      });

      let taskDoc;
      if (existingTask) {
        taskDoc = existingTask;
        await db.collection('tasks').updateOne(
          { _id: existingTask._id },
          {
            $set: {
              ...taskBlueprint,
              updatedAt: new Date(),
            },
          }
        );
      } else {
        const now = new Date();
        taskDoc = { ...taskBlueprint, createdAt: now, updatedAt: now };
        const result = await db.collection('tasks').insertOne(taskDoc);
        taskDoc._id = result.insertedId;
      }
      tasks.push(taskDoc);
    }
    taskMap.set(key, tasks);
  }

  return { projectMap, taskMap };
}

async function upsertStudents(db) {
  const students = [];
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const student of NEW_STUDENTS) {
    const existing = await db.collection('students').findOne({
      $or: [{ email: student.email }, { studentIdNumber: student.studentIdNumber }],
    });

    if (existing) {
      const createdAt = daysAgo(student.historyStartDaysAgo + 7, 9);
      await db.collection('students').updateOne(
        { _id: existing._id },
        {
          $set: {
            name: student.name,
            gender: student.gender,
            dateOfBirth: utcDate(student.dateOfBirth),
            address: student.address,
            nicNumber: student.nicNumber,
            academicYear: student.academicYear,
            semester: student.semester,
            specialization: student.specialization,
            isVerified: true,
            createdAt,
            updatedAt: daysAgo(student.latestActivityDaysAgo, 9),
          },
        }
      );
      students.push({ ...existing, ...student, _id: existing._id });
      continue;
    }

    const createdAt = daysAgo(student.historyStartDaysAgo + 7, 9);
    const doc = {
      studentIdNumber: student.studentIdNumber.toLowerCase(),
      name: student.name,
      email: student.email.toLowerCase(),
      password: passwordHash,
      gender: student.gender,
      dateOfBirth: utcDate(student.dateOfBirth),
      address: student.address,
      nicNumber: student.nicNumber,
      userRole: 'student',
      academicYear: student.academicYear,
      semester: student.semester,
      specialization: student.specialization,
      isVerified: true,
      createdAt,
      updatedAt: daysAgo(student.latestActivityDaysAgo, 9),
    };
    const result = await db.collection('students').insertOne(doc);
    students.push({ ...student, ...doc, _id: result.insertedId });
  }

  return students;
}

async function seedStudentActivity(db, students, courseMap, projectMap, taskMap) {
  const studentIds = students.map((student) => String(student._id));

  await Promise.all([
    db.collection('studentprojectprogresses').deleteMany({ studentId: { $in: studentIds } }),
    db.collection('studenttaskprogresses').deleteMany({ studentId: { $in: studentIds } }),
    db.collection('predictions').deleteMany({ studentId: { $in: students.map((student) => student._id) } }),
    db.collection('learninggoals').deleteMany({ studentId: { $in: students.map((student) => student._id) } }),
  ]);

  let projectProgressCount = 0;
  let taskProgressCount = 0;
  let predictionCount = 0;
  let goalCount = 0;

  for (const student of students) {
    const engagedCourses = student.engagedCourseKeys.map((key) => courseMap.get(key)).filter(Boolean);
    const profile = BAND_PROFILES[student.band];

    for (let courseIndex = 0; courseIndex < engagedCourses.length; courseIndex += 1) {
      const courseKey = student.engagedCourseKeys[courseIndex];
      const project = projectMap.get(courseKey);
      const tasks = taskMap.get(courseKey) || [];

      if (project) {
        const status =
          courseIndex < Math.round(engagedCourses.length * profile.doneRatio)
            ? 'done'
            : courseIndex < Math.round(engagedCourses.length * (profile.doneRatio + profile.inprogressRatio))
              ? 'inprogress'
              : 'todo';
        const updatedAt = daysAgo(
          interpolateDays(
            student.historyStartDaysAgo - 4,
            student.latestActivityDaysAgo + 2,
            Math.max(engagedCourses.length, 2),
            courseIndex
          ),
          14
        );
        await db.collection('studentprojectprogresses').insertOne({
          studentId: String(student._id),
          projectId: String(project._id),
          status,
          mainTasks: cloneMainTasks(project.mainTasks || [], status),
          createdAt: updatedAt,
          updatedAt,
        });
        projectProgressCount += 1;
      }

      for (let taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
        const task = tasks[taskIndex];
        const statusIndex = courseIndex * 2 + taskIndex;
        const status =
          statusIndex % 3 === 0
            ? 'done'
            : statusIndex % 3 === 1
              ? 'inprogress'
              : student.band === 'bad'
                ? 'todo'
                : 'inprogress';
        const updatedAt = daysAgo(
          interpolateDays(
            student.historyStartDaysAgo - 2,
            student.latestActivityDaysAgo,
            Math.max(tasks.length * engagedCourses.length, 2),
            statusIndex
          ),
          15
        );
        await db.collection('studenttaskprogresses').insertOne({
          studentId: String(student._id),
          taskId: String(task._id),
          status,
          subtasks: cloneSubtasks(task.subtasks || [], status),
          createdAt: updatedAt,
          updatedAt,
        });
        taskProgressCount += 1;
      }
    }

    const predictions = predictionDocs(student, engagedCourses.length);
    if (predictions.length) {
      await db.collection('predictions').insertMany(predictions);
      predictionCount += predictions.length;
    }

    const goals = learningGoals(student, engagedCourses);
    if (goals.length) {
      await db.collection('learninggoals').insertMany(goals);
      goalCount += goals.length;
    }
  }

  return { projectProgressCount, taskProgressCount, predictionCount, goalCount };
}

async function backupMatchingDocs(db) {
  const backupName = `seed_backups_${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;
  const backup = db.collection(backupName);
  const studentEmails = NEW_STUDENTS.map((item) => item.email.toLowerCase());
  const lecturerEmails = NEW_LECTURERS.map((item) => item.email.toLowerCase());
  const courseNames = [
    'Introduction to Programming',
    'Deep Learning',
    'Secure Software Development',
    'Robotics and Intelligence Systems',
    ...NEW_COURSES.map((item) => item.courseName),
  ];

  const [students, lecturers, courses] = await Promise.all([
    db.collection('students').find({ email: { $in: studentEmails } }).toArray(),
    db.collection('lecturers').find({ email: { $in: lecturerEmails } }).toArray(),
    db.collection('courses').find({ courseName: { $in: courseNames } }).toArray(),
  ]);

  const docs = [
    ...students.map((doc) => ({ collection: 'students', document: doc })),
    ...lecturers.map((doc) => ({ collection: 'lecturers', document: doc })),
    ...courses.map((doc) => ({ collection: 'courses', document: doc })),
  ];

  if (docs.length) {
    await backup.insertMany(docs);
  }

  return { backupName, count: docs.length };
}

async function main() {
  loadEnvFile(path.join(process.cwd(), 'frontend/.env'));

  await mongoose.connect(process.env.MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  const backup = await backupMatchingDocs(db);

  const existingLecturers = await db
    .collection('lecturers')
    .find({}, { projection: { name: 1, email: 1, position: 1 } })
    .toArray();
  const newLecturers = await upsertLecturers(db);
  const allLecturers = await db
    .collection('lecturers')
    .find({}, { projection: { name: 1, email: 1, position: 1 } })
    .toArray();
  const lecturersByEmail = new Map(allLecturers.map((lecturer) => [lecturer.email, lecturer]));

  const courseMap = await upsertCourses(db, lecturersByEmail, existingLecturers);
  const { projectMap, taskMap } = await upsertProjectsAndTasks(db, courseMap);
  const students = await upsertStudents(db);
  const activitySummary = await seedStudentActivity(db, students, courseMap, projectMap, taskMap);

  console.log(
    JSON.stringify(
      {
        backup,
        addedLecturers: newLecturers.length,
        totalLecturersNow: allLecturers.length,
        addedOrUpdatedStudents: students.length,
        totalCoursesTracked: courseMap.size,
        projectProgressInserted: activitySummary.projectProgressCount,
        taskProgressInserted: activitySummary.taskProgressCount,
        predictionsInserted: activitySummary.predictionCount,
        learningGoalsInserted: activitySummary.goalCount,
        defaultPassword: DEFAULT_PASSWORD,
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
