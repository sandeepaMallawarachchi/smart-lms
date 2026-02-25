import { ReminderJobPayload } from './jobTypes';
import { connectDB } from '@/lib/db';
import { Notification } from '@/model/projects-and-tasks/notificationModel';
import {
  Project,
  StudentProjectProgress,
  StudentTaskProgress,
  Task,
} from '@/model/projects-and-tasks/lecturer/projectTaskModel';

function getReminderContent(input: {
  itemType: 'project' | 'task';
  itemName: string;
  reminderType: string;
  reminderPercentage: number;
  progressSummary: string;
}) {
  const prefix = input.itemType === 'project' ? 'Project' : 'Task';

  if (input.reminderType.endsWith('_25')) {
    return {
      title: `${prefix}: ${input.itemName} - Time to Start (25%)`,
      message: `${input.itemName} deadline is approaching.`,
      description: `You still have 75% of the time left. Start now. ${input.progressSummary}`,
    };
  }

  if (input.reminderType.endsWith('_50')) {
    return {
      title: `${prefix}: ${input.itemName} - Halfway (50%)`,
      message: `${input.itemName} has reached the halfway point.`,
      description: `You're at the 50% time mark. ${input.progressSummary}`,
    };
  }

  if (input.reminderType.endsWith('_75')) {
    return {
      title: `${prefix}: ${input.itemName} - Deadline Near (75%)`,
      message: `${input.itemName} is nearing its deadline.`,
      description: `Only 25% of time remains. ${input.progressSummary}`,
    };
  }

  return {
    title: `${prefix}: ${input.itemName} - Deadline Time`,
    message: `${input.itemName} deadline is now.`,
    description: `Final reminder for this deadline. ${input.progressSummary}`,
  };
}

export async function processReminderJob(payload: ReminderJobPayload): Promise<void> {
  const itemId = payload.projectId || payload.taskId;
  if (!itemId) return;

  await connectDB();

  const isProject = payload.itemType === 'project';
  const item = isProject
    ? await Project.findById(itemId).lean()
    : await Task.findById(itemId).lean();

  if (!item) return;

  const progress = isProject
    ? await StudentProjectProgress.findOne({
        studentId: payload.studentId,
        projectId: itemId,
      }).lean()
    : await StudentTaskProgress.findOne({
        studentId: payload.studentId,
        taskId: itemId,
      }).lean();

  if (!progress || progress.status === 'done') {
    return;
  }

  const effectiveItemName =
    (isProject ? (item as any).projectName : (item as any).taskName) || payload.itemName;
  const dedupeKey = `notif:${payload.studentId}:${itemId}:${payload.reminderType}`;

  const existing = await Notification.findOne({ dedupeKey }).lean();
  if (existing) return;

  let progressSummary = '';
  let taskProgressData: any[] = [];

  if (isProject) {
    const mainTasks = (progress as any).mainTasks || [];
    const totalMainTasks = mainTasks.length;
    const completedMainTasks = mainTasks.filter((mt: any) => mt.completed).length;

    let totalSubtasks = 0;
    let completedSubtasks = 0;

    mainTasks.forEach((mt: any) => {
      const subtasks = mt.subtasks || [];
      totalSubtasks += subtasks.length;
      completedSubtasks += subtasks.filter((st: any) => st.completed).length;
    });

    progressSummary = `Progress: ${completedMainTasks}/${totalMainTasks} main tasks, ${completedSubtasks}/${totalSubtasks} subtasks completed.`;

    taskProgressData = mainTasks.map((mt: any) => ({
      mainTaskId: mt.id,
      mainTaskTitle: mt.title,
      subtasks:
        mt.subtasks?.map((st: any) => ({
          id: st.id,
          title: st.title,
          completed: st.completed || false,
        })) || [],
      completed: mt.completed || false,
      totalTasks: mt.subtasks?.length || 0,
      completedCount: mt.subtasks?.filter((st: any) => st.completed).length || 0,
    }));
  } else {
    const subtasks = (progress as any).subtasks || [];
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter((st: any) => st.completed).length;

    progressSummary = `Progress: ${completedSubtasks}/${totalSubtasks} subtasks completed.`;
    taskProgressData = [
      {
        subtasks: subtasks.map((st: any) => ({
          id: st.id,
          title: st.title,
          completed: st.completed || false,
        })),
        completed: subtasks.every((st: any) => st.completed),
        totalTasks: totalSubtasks,
        completedCount: completedSubtasks,
      },
    ];
  }

  const content = getReminderContent({
    itemType: payload.itemType,
    itemName: effectiveItemName,
    reminderType: payload.reminderType,
    reminderPercentage: payload.reminderPercentage,
    progressSummary,
  });

  await Notification.create({
    studentId: payload.studentId,
    projectId: payload.projectId,
    taskId: payload.taskId,
    itemType: payload.itemType,
    itemName: effectiveItemName,
    reminderType: payload.reminderType,
    dedupeKey,
    type: isProject ? 'project_reminder' : 'task_reminder',
    reminderPercentage: payload.reminderPercentage,
    title: content.title,
    message: content.message,
    description: content.description,
    taskProgress: taskProgressData,
    isRead: false,
    isSent: true,
    sentAt: new Date(),
    scheduledFor: new Date(payload.scheduledFor),
  });
}
