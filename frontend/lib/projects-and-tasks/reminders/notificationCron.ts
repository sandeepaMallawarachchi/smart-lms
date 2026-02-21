import cron from 'node-cron';
import { connectDB } from '@/lib/db';
import { ScheduledReminder, Notification } from '@/model/projects-and-tasks/notificationModel';
import { Project, Task, StudentProjectProgress, StudentTaskProgress } from '@/model/projects-and-tasks/lecturer/projectTaskModel';

export function startNotificationCron() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await connectDB();
      
      const now = new Date();
      const reminders = await ScheduledReminder.find({
        isProcessed: false,
        scheduledFor: { $lte: now },
      });

      console.log(`Cron: Found ${reminders.length} reminders to process`);

      for (const reminder of reminders) {
        const isProject = !!reminder.projectId;
        const item = isProject
          ? await Project.findById(reminder.projectId)
          : await Task.findById(reminder.taskId);

        const progress = isProject
          ? await StudentProjectProgress.findOne({
              studentId: reminder.studentId,
              projectId: reminder.projectId,
            })
          : await StudentTaskProgress.findOne({
              studentId: reminder.studentId,
              taskId: reminder.taskId,
            });

        if (!item || !progress || progress.status === 'done') {
          await ScheduledReminder.updateOne({ _id: reminder._id }, { isProcessed: true });
          continue;
        }

        // Check if notification already exists
        const exists = await Notification.findOne({
          studentId: reminder.studentId,
          projectId: reminder.projectId,
          taskId: reminder.taskId,
          reminderPercentage: reminder.reminderPercentage,
        });

        if (exists) {
          await ScheduledReminder.updateOne({ _id: reminder._id }, { isProcessed: true });
          continue;
        }

        // Calculate progress summary
        let progressSummary = '';
        let taskProgressData: any[] = [];

        if (isProject) {
          const mainTasks = progress.mainTasks || [];
          const totalMainTasks = mainTasks.length;
          const completedMainTasks = mainTasks.filter((mt: any) => mt.completed).length;
          
          let totalSubtasks = 0;
          let completedSubtasks = 0;
          
          mainTasks.forEach((mt: any) => {
            const subtasks = mt.subtasks || [];
            totalSubtasks += subtasks.length;
            completedSubtasks += subtasks.filter((st: any) => st.completed).length;
          });

          progressSummary = `Progress: ${completedMainTasks}/${totalMainTasks} main tasks completed`;
          if (totalSubtasks > 0) {
            progressSummary += `, ${completedSubtasks}/${totalSubtasks} subtasks done`;
          }

          taskProgressData = mainTasks.map((mt: any) => ({
            mainTaskId: mt.id,
            mainTaskTitle: mt.title,
            subtasks: mt.subtasks?.map((st: any) => ({
              id: st.id,
              title: st.title,
              completed: st.completed || false,
            })) || [],
            completed: mt.completed || false,
            totalTasks: mt.subtasks?.length || 0,
            completedCount: mt.subtasks?.filter((st: any) => st.completed).length || 0,
          }));
        } else {
          const subtasks = progress.subtasks || [];
          const totalSubtasks = subtasks.length;
          const completedSubtasks = subtasks.filter((st: any) => st.completed).length;

          progressSummary = `Progress: ${completedSubtasks}/${totalSubtasks} subtasks completed`;

          taskProgressData = [{
            subtasks: subtasks.map((st: any) => ({
              id: st.id,
              title: st.title,
              completed: st.completed || false,
            })),
            completed: subtasks.every((st: any) => st.completed),
            totalTasks: totalSubtasks,
            completedCount: completedSubtasks,
          }];
        }

        const messages: Record<string, any> = {
          project_25: {
            title: '⏰ Time to Start!',
            message: `${item.projectName} deadline approaching`,
            description: `You have 75% of the time left. Start working on ${item.projectName} now! ${progressSummary}.`,
          },
          project_50: {
            title: '📅 Halfway There!',
            message: `${item.projectName} is 50% through`,
            description: `Complete half of the work on ${item.projectName}! ${progressSummary}.`,
          },
          project_75: {
            title: '⚠️ Deadline is Near!',
            message: `${item.projectName} deadline approaching fast`,
            description: `Just 25% of time left. Finish up ${item.projectName}! ${progressSummary}.`,
          },
          project_deadline: {
            title: '🚨 Deadline Today!',
            message: `${item.projectName} deadline is today`,
            description: `Today is the deadline for ${item.projectName}. Complete it now! ${progressSummary}.`,
          },
          project_overdue: {
            title: '❌ Deadline Overdue!!!',
            message: `${item.taskName} deadline is overdued`,
            description: `Deadline for ${item.taskName} is overdued. Late submit it! ${progressSummary}.`,
          },
          task_25: {
            title: '⏰ Time to Start!',
            message: `${item.taskName} deadline approaching`,
            description: `You have 75% of the time left. Start working on ${item.taskName} now! ${progressSummary}.`,
          },
          task_50: {
            title: '📅 Halfway There!',
            message: `${item.taskName} is 50% through`,
            description: `Complete half of the work on ${item.taskName}! ${progressSummary}.`,
          },
          task_75: {
            title: '⚠️ Deadline is Near!',
            message: `${item.taskName} deadline approaching fast`,
            description: `Just 25% of time left. Finish up ${item.taskName}! ${progressSummary}.`,
          },
          task_deadline: {
            title: '🚨 Deadline Today!',
            message: `${item.taskName} deadline is today`,
            description: `Today is the deadline for ${item.taskName}. Complete it now! ${progressSummary}.`,
          },
          task_overdue: {
            title: '❌ Deadline Overdue!!!',
            message: `${item.taskName} deadline is overdued`,
            description: `Deadline for ${item.taskName} is overdued. Late submit it! ${progressSummary}.`,
          },
        };

        const msg = messages[reminder.reminderType];

        await Notification.create({
          studentId: reminder.studentId,
          projectId: reminder.projectId,
          taskId: reminder.taskId,
          type: 'project_reminder',
          reminderPercentage: reminder.reminderPercentage,
          title: msg.title,
          message: msg.message,
          description: msg.description,
          taskProgress: taskProgressData,
          isRead: false,
          isSent: true,
          sentAt: now,
          scheduledFor: reminder.scheduledFor,
        });

        await ScheduledReminder.updateOne({ _id: reminder._id }, { isProcessed: true });
        console.log(`Created: ${msg.title} for ${item.projectName || item.taskName}`);
      }
    } catch (error) {
      console.error('Cron error:', error);
    }
  });

  console.log('Notification cron started (runs every minute)');
}