import { Bot } from "mineflayer";
import Observer from "./obs";
import { getBasicObservations } from "./lib";
import { openAICompletion } from "./openai";
import { runExec } from "./exec";
import { readFileSync } from "fs";

const PROMPT = readFileSync("./src/prompts/code.txt", "utf-8");

export default class TaskManager {

  // executionEngine: ExecutionEngine
  bot: Bot // TODO: we need this here?
  
  constructor(bot: Bot) {
    this.bot = bot;
    // this.executionEngine = new ExecutionEngine();
  }

  async runPrompt(obs: Observer, task: string, previousObs: Observer | null = null) {  
    const prompt = `
Code from the last round: ${previousObs?.code || "(None)"}
Execution error: ${previousObs?.error?.toString() || "(None)"}
Chat log: ${previousObs?.logs.join('\n') || "(None)"}
${getBasicObservations(this.bot)}
Task: ${task}
    `
  
    this.bot.chat(`Task: ${task}...`)
  
    console.log("\n\n\n\n")
    console.log(prompt)
    console.log("\n\n\n\n")
  
    const chatCompletion = await openAICompletion(PROMPT, prompt);
  
    const responseContent = chatCompletion.data.choices[0].message.content;
  
    console.log(responseContent);
  
    const regex = /```javascript(.*?)```/gs;
    const match = regex.exec(responseContent);
    if (!match) {
      throw new Error("No code found in response");
    }
    const code = match[1];

    return await runExec(this.bot, obs, code);
  }

  async runTask(task: string) {
    const obs = new Observer(this.bot)
    const e = await this.runPrompt(obs, task)

    if(e) {
      // TODO: retries
      throw new Error(`Task failed: ${task}`)

      // // try again
      // const obs2 = new Observer(this.bot)
      // const e2 = await this.runPrompt(obs2, task, obs)
      // if (e2) {
      //   this.bot.chat('I failed to run your code twice, I give up.')
        
      // }
    }
  }
}
