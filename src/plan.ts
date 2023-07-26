import { Bot } from "mineflayer"
import { runPlan2, runCritic, runPlan3 } from "./openai";
import TaskManager from "./task";
import { trace } from '@opentelemetry/api';

export default class PlanManager {

  bot: Bot
  taskManager: TaskManager
  currentProject: string | null;

  constructor(bot: Bot) {
    this.bot = bot;
    this.taskManager = new TaskManager(bot);
  }

  async runProject(project: string) {    

    const tracer = trace.getTracer('voyager')

    return await tracer.startActiveSpan('project', {
      attributes: {
        'text': project
      }
    }, async (span) => {

      console.warn('===TRACE ID===')
      console.warn(span.spanContext().traceId)
      console.warn('==============')

      if (!!this.currentProject) {
        this.bot.chat(`Already running a project ${this.currentProject}`)
        return
      }
  
      this.currentProject = project;
      this.bot.chat(`I'm thinking....`);


      // looping this

      let projectCompleted = false;

      try {
        let lastTask = null;
        let lastCritique = null;

        while(!projectCompleted) {
          const tasks = await runPlan3(this.bot, project, lastTask, lastCritique)

          const { task, reasoning } = tasks[0];
          console.log(`Total of ${tasks.length} tasks`);
          console.log('==============');
          console.log(tasks);
          console.log('==============');

          this.bot.chat(`Got task: ${task}.`);

          console.log(`Task started: ${task}`);
          // retry logic here
          const { success, critique } = await this.taskManager.runTask(task, reasoning);

          if (!success) {
            // Try again at task level?
            console.log(`Task failed: ${task}`)
            projectCompleted = false;
            lastTask = task;
            lastCritique = critique;
            // pass critique
          } else {
            console.log(`Task done: ${task}`);
            // if task succeeded, run project critique
            console.log('Task successful. Running project critique');
            const { success, critique } = await runCritic(this.bot, project);
            projectCompleted = success;
            lastTask = task;
            lastCritique = critique;
            // move forward, passing critique to next task
            if (projectCompleted) {
              this.bot.chat(`Project complete!`)
            } else {
              this.bot.chat(`Project not complete. Moving on to next task.`)
            }
          }
        }
      } catch(e) {
        // TODO: dealing with errors for real
        console.warn('Task errored out')
      } finally {
        span.end()
        this.currentProject = null;
      }
    })
  }
}
