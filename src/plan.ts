import { Bot } from "mineflayer"
import { readFileSync } from "fs"
import { getBasicObservations } from "./lib";
import { openAICompletion } from "./openai";
import * as jsYAML from "js-yaml";
import TaskManager from "./task";
import { trace } from '@opentelemetry/api';

const PROMPT = readFileSync("./src/prompts/plan.txt", "utf-8");

export default class PlanManager {

  bot: Bot
  taskManager: TaskManager
  currentProject: string | null;

  constructor(bot: Bot) {
    this.bot = bot;
    this.taskManager = new TaskManager(bot);
  }

  async runProject(message: string) {    

    const tracer = trace.getTracer('voyager')

    return await tracer.startActiveSpan('project', {
      attributes: {
        'text': message
      }
    }, async (span) => {

      console.warn('===TRACE ID===')
      console.warn(span.spanContext().traceId)
      console.warn('==============')

      if (!!this.currentProject) {
        this.bot.chat(`Already running a project ${this.currentProject}`)
        return
      }
  
      this.currentProject = message;
      this.bot.chat(`I'm thinking....`);
  
      const prompt = `
  ${getBasicObservations(this.bot)}
  Project: ${message}
      `;
      
      const yaml = await tracer.startActiveSpan('openai.plan', {
        attributes: {
          prompt,
        }
      }, async (span) => {
        const chatCompletion = await openAICompletion(PROMPT, prompt);
        const responseContent = chatCompletion.data.choices[0].message.content;

        span.addEvent('openai.plan.response', {
          response: responseContent
        })

        console.warn('===Plan===')
        console.log(responseContent)
        console.warn('============')        

        // Project to tasks    
        const regex = /```yaml(.*?)```/gs;
        const match = regex.exec(responseContent);
        if (!match) {
          throw new Error("No code found in response");
        }

        span.end()
        return jsYAML.load(match[1]);
      })
    
      this.bot.chat(`Got ${yaml.length} tasks.`);

      span.addEvent('plan.started', {
        tasks: JSON.stringify(yaml),
        count: yaml.length,
      })

      try {
        for (const { task } of yaml) {
          console.log(`Task started: ${task}`);
          // retry logic here
          await this.taskManager.runTask(task);    
          console.log(`Task done: ${task}`);      
        }
      } catch(e) {
        console.warn('Plan errored out')
      } finally {
        span.end()
        this.currentProject = null;
      }
    })
  }

}
