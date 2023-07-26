import { Bot } from "mineflayer";
import Observer from "./obs";
import { getBasicObservations } from "./lib";
import { openAICompletion, runCritic } from "./openai";
import { runExec } from "./exec";
import { readFileSync } from "fs";
import { trace } from '@opentelemetry/api';
import { storeCode } from "./code";

const PROMPT = readFileSync("./src/prompts/code.txt", "utf-8");

export default class TaskManager {

  // executionEngine: ExecutionEngine
  bot: Bot // TODO: we need this here?
  
  constructor(bot: Bot) {
    this.bot = bot;
    // this.executionEngine = new ExecutionEngine();
  }

  private async runPrompt(obs: Observer, task: string, previousObs: Observer | null, prevCritique: string | null): Promise<{ success: boolean, critique: string, code: string, attemptId: string }> {  
    const tracer = trace.getTracer('voyager')

    const prompt = `
Code from the last round: ${previousObs?.code || "(None)"}
Execution error: ${previousObs?.error?.toString() || "(None)"}
Chat log: ${previousObs?.logs.join('\n') || "(None)"}
Critique from last round: ${prevCritique || "(None)"}
${getBasicObservations(this.bot)}
Task: ${task}
        `
  
    this.bot.chat(`Task: ${task}...`)    

    return await tracer.startActiveSpan('openai.task', {
      attributes: {
        prompt,
      }
    }, async (span) => {

      console.log("\n====PROMPT=====") 
      console.log(prompt)
      console.log("================\n")
    
      const chatCompletion = await openAICompletion(PROMPT, prompt);
    
      const responseContent = chatCompletion.data.choices[0].message.content;
    
      console.log(responseContent);
    
      const regex = /```javascript(.*?)```/gs;
      const match = regex.exec(responseContent);
      if (!match) {
        throw new Error("No code found in response");
      }      

      const code = match[1];
      const attemptId = span.spanContext().spanId;

      const e = await runExec(this.bot, obs, code);

      if (e) {
        return {
          success: false,
          critique: `Error: ${e.name} ${e.message}`,
          code,
          attemptId,
        }
      }

      console.log('Running critique');
      const { success, critique } = await runCritic(this.bot, task);
  
      return { success, critique, code, attemptId };
    })
  }

  async runTask(task: string, reasoning: string) {
    const tracer = trace.getTracer('voyager')

    return await tracer.startActiveSpan('runTask', {
      attributes: {
        text: task,
      }
    }, async (span) => {
      let attempts = 0;
      let completed = false;
      let lastObservation = null;
      let lastCritique = null;
      const MAX_ATTEMPTS = 2;

      const traceId = span.spanContext().traceId;
      const parentId = span.spanContext().spanId;

      while(!completed && attempts < MAX_ATTEMPTS) {
        const obs = new Observer(this.bot);

        const { success, critique, code, attemptId } = await this.runPrompt(obs, task, lastObservation, lastCritique);

        // store code here?
        await storeCode(traceId, parentId, attemptId, code, success, critique)

        attempts++;
        completed = success;
        lastObservation = obs;
        lastCritique = critique;
      }

      span.end()

      return { 
        success: completed,
        critique: lastCritique,
      }
    })
  }
}
