export interface TaskProgressData {
    mainTaskId?: string;
    mainTaskTitle?: string;
    subtasks?: Array<{
        id: string;
        title: string;
        completed: boolean;
    }>;
    completed: boolean;
    totalTasks?: number;
    completedCount?: number;
}

export interface ReminderConfig {
    percentages: Array<{
        percentage: number;
        label: string;
    }>;
    calculateScheduleTime: (deadlineDate: Date, percentage: number) => Date;
    generateMessage: (percentage: number, itemName: string, isProject: boolean) => string;
}

export const projectReminderConfig: ReminderConfig = {
    percentages: [
        { percentage: 25, label: '25%' },
        { percentage: 50, label: '50%' },
        { percentage: 75, label: '75%' },
        { percentage: 100, label: 'Deadline' },
    ],
    //   calculateScheduleTime: (deadlineDate: Date, percentage: number): Date => {
    //     const deadline = new Date(deadlineDate);
    //     const now = new Date();
    //     const totalMillis = deadline.getTime() - now.getTime();
    //     const percentageMillis = (totalMillis * percentage) / 100;
    //     return new Date(now.getTime() + percentageMillis);
    //   },

    calculateScheduleTime: (deadlineDate: Date, percentage: number): Date => {
        const deadline = new Date(deadlineDate);
        const now = new Date();

        // TESTING: More spread out timings
        const testMode = true;

        if (testMode) {
            const delaySeconds = {
                25: 10,   // 10 seconds from now
                50: 30,   // 30 seconds from now
                75: 60,   // 1 minute from now
                100: 90,  // 1.5 minutes from now
            } as Record<number, number>;

            return new Date(now.getTime() + (delaySeconds[percentage] || 10) * 1000);
        }

        // Production
        const totalMillis = deadline.getTime() - now.getTime();
        const percentageMillis = (totalMillis * percentage) / 100;
        return new Date(now.getTime() + percentageMillis);
    },

    generateMessage: (percentage: number, itemName: string): string => {
        if (percentage === 25) {
            return `⏰ Time to start! ${itemName} deadline is approaching. You have 75% of time left - start working now!`;
        } else if (percentage === 50) {
            return `⚠️ Halfway there! ${itemName} is 50% through its deadline. Complete half of the work!`;
        } else if (percentage === 75) {
            return `🚨 Deadline is near! ${itemName} deadline is just around the corner. Finish up!`;
        } else {
            return `📅 Today is the deadline for ${itemName}!`;
        }
    },
};

export const calculateTaskProgress = (mainTasks: any[]): TaskProgressData[] => {
    return mainTasks.map((mainTask) => {
        const subtasks = mainTask.subtasks || [];
        const completedCount = subtasks.filter((st: any) => st.completed).length;
        const totalTasks = subtasks.length;

        return {
            mainTaskId: mainTask.id,
            mainTaskTitle: mainTask.title,
            subtasks: subtasks.map((st: any) => ({
                id: st.id,
                title: st.title,
                completed: st.completed || false,
            })),
            completed: mainTask.completed || false,
            totalTasks,
            completedCount,
        };
    });
};

export const calculateSubtaskProgress = (subtasks: any[]): TaskProgressData => {
    const completedCount = subtasks.filter((st: any) => st.completed).length;
    const totalTasks = subtasks.length;

    return {
        subtasks: subtasks.map((st: any) => ({
            id: st.id,
            title: st.title,
            completed: st.completed || false,
        })),
        completed: completedCount === totalTasks,
        totalTasks,
        completedCount,
    };
};

export const shouldSendReminder = (
    deadlineDate: Date,
    reminderPercentage: number,
    itemStatus: string
): boolean => {
    if (itemStatus !== 'todo' && itemStatus !== 'inprogress') {
        return false;
    }

    const now = new Date();
    const deadline = new Date(deadlineDate);
    const totalTime = deadline.getTime() - new Date(deadlineDate).setHours(0, 0, 0, 0);
    const remainingTime = deadline.getTime() - now.getTime();
    const percentageElapsed = ((totalTime - remainingTime) / totalTime) * 100;

    return percentageElapsed >= reminderPercentage && remainingTime > 0;
};