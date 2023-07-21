import { Bot } from "mineflayer"
import { readFileSync } from "fs"
import { getBasicObservations } from "./lib";
import { openAICompletion } from "./openai";
import * as jsYAML from "js-yaml";
import TaskManager from "./task";

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

    if (!!this.currentProject) {
      this.bot.chat(`Already running a project ${message}`)
      return
    }

    this.currentProject = message;
    this.bot.chat(`I'm thinking....`);

    const prompt = `
${getBasicObservations(this.bot)}
Project: ${message}
    `;

    console.log(prompt);

    const chatCompletion = await openAICompletion(PROMPT, prompt);

    const responseContent = chatCompletion.data.choices[0].message.content;

    console.log(responseContent);

    // Project to tasks    
    const regex = /```yaml(.*?)```/gs;
    const match = regex.exec(responseContent);
    if (!match) {
      throw new Error("No code found in response");
    }
    const yaml = jsYAML.load(match[1]);

    this.bot.chat(`Got ${yaml.length} tasks.`);

    for (const { task } of yaml) {
      console.log(`Task started: ${task}`);

      // retry logic here
      await this.taskManager.runTask(task);

      console.log(`Task done: ${task}`);      
    }

    // TODO: replanning

    this.currentProject = null;

  }

}
