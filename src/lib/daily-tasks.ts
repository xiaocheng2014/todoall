import { db } from "@/lib/db";
import { getZonedDate, zonedDateTimeToUtc } from "@/lib/dates";
import { isPlanScheduledOnDate } from "@/lib/recurrence";

export async function ensureDailyTasksForUser(
  userId: string,
  timeZone: string,
  instant = new Date(),
): Promise<string> {
  const zonedDate = getZonedDate(instant, timeZone);
  const plans = await db.plan.findMany({
    where: {
      userId,
      status: "ACTIVE",
      startDate: { lte: zonedDate.date },
      OR: [{ endDate: null }, { endDate: { gte: zonedDate.date } }],
    },
  });

  const scheduledPlans = plans.filter((plan) =>
    isPlanScheduledOnDate(plan, zonedDate.date, zonedDate.weekday),
  );

  if (scheduledPlans.length > 0) {
    await db.$transaction(
      scheduledPlans.map((plan) =>
        db.dailyTask.upsert({
        where: {
          planId_taskDate: {
            planId: plan.id,
            taskDate: zonedDate.date,
          },
        },
        update: {},
        create: {
          userId,
          planId: plan.id,
          taskDate: zonedDate.date,
          nameSnapshot: plan.name,
          metricTypeSnapshot: plan.metricType,
          targetValueSnapshot: plan.targetValue,
          unitSnapshot: plan.unit,
          executionAt: plan.executionTime
            ? zonedDateTimeToUtc(zonedDate.date, plan.executionTime, timeZone)
            : null,
        },
        }),
      ),
    );
  }

  return zonedDate.date;
}
