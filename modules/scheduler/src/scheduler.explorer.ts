import { cron } from "../deps.ts";
import { factory } from "../../../src/factorys/class.factory.ts";
import { CronJob, schedulerRegistry, TimeJob } from "./scheduler.registry.ts";

export class ScheduleExplorer {
  onModuleInit() {
    return Promise.all([
      this.#startCron(),
      this.#startTimeout(),
      this.#startInterval(),
    ]);
  }

  async #startCron() {
    if (schedulerRegistry.cronMap.size === 0) {
      return;
    }
    for (const [target, cronJobs] of schedulerRegistry.cronMap) {
      const instance = await factory.create(target);
      cronJobs.forEach((cronItem: CronJob) => {
        const cronTime = cronItem.cronTime;
        const methodName = cronItem.methodName;
        cron(cronTime, async () => {
          try {
            await instance[methodName]();
          } catch (err) {
            console.error("SchedulerError", err);
          }
        });
      });
    }
  }

  async #startTimeout() {
    if (schedulerRegistry.timeoutMap.size === 0) {
      return;
    }
    for (const [target, timeoutJobs] of schedulerRegistry.timeoutMap) {
      const instance = await factory.create(target);
      timeoutJobs.forEach((timeoutItem: TimeJob) => {
        const delay = timeoutItem.delay;
        const methodName = timeoutItem.methodName;
        const jobName = timeoutItem.jobName;
        const timeKey = setTimeout(async () => {
          try {
            await instance[methodName]();
          } catch (err) {
            console.error("SchedulerError", err);
          }
        }, delay);
        schedulerRegistry.registerTime(timeKey, jobName);
      });
    }
  }

  async #startInterval() {
    if (schedulerRegistry.intervalMap.size === 0) {
      return;
    }
    for (const [target, intervalJobs] of schedulerRegistry.intervalMap) {
      const instance = await factory.create(target);
      intervalJobs.forEach((intervalItem: TimeJob) => {
        const delay = intervalItem.delay;
        const methodName = intervalItem.methodName;
        const jobName = intervalItem.jobName;
        const timeKey = setInterval(async () => {
          try {
            await instance[methodName]();
          } catch (err) {
            console.error("SchedulerError", err);
          }
        }, delay);
        schedulerRegistry.registerTime(timeKey, jobName);
      });
    }
  }
}
