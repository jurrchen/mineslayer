import { Configuration, OpenAIApi } from "openai";

import 'dotenv/config'
import { Bot } from "mineflayer";
import { trace } from '@opentelemetry/api';
import { getBasicObservations } from "./lib";
import { readFileSync } from "fs"
import * as jsYAML from "js-yaml";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});
const openai = new OpenAIApi(configuration);

const CRITIC = readFileSync("./src/prompts/critic.txt", "utf-8");

export async function runCritic(bot: Bot, message: string) {
  const tracer = trace.getTracer('voyager')

  const prompt = `${getBasicObservations(bot)}
Task: ${message}
`;

  return await tracer.startActiveSpan('openai.critic', {
    attributes: {
      prompt,
    }
  }, async (span) => {
    const chatCompletion = await openAICompletion(CRITIC, prompt);
    const responseContent = chatCompletion.data.choices[0].message.content;

    span.addEvent('openai.critic.response', {
      response: responseContent
    })

    console.warn('===CRITIQUE===')
    console.log(responseContent)
    console.warn('=============')

    // Project to tasks    
    // const regex = /```yaml(.*?)```/gs;
    // const match = regex.exec(responseContent);
    // if (!match) {
    //   throw new Error("No code found in response");
    // }

    span.end()
    return JSON.parse(responseContent);
  })
}

const PLAN2 = readFileSync("./src/prompts/plan2.txt", "utf-8");

export async function runPlan2(bot: Bot, message: string, lastTask: string | null, lastCritique: string | null) {
  const tracer = trace.getTracer('voyager')

  const prompt = `
  ${getBasicObservations(bot)}
  Project: ${message}
  Last Task: ${lastTask || "(None)"}
  Last Critique: ${lastCritique || "(None)"}
      `;  

  return await tracer.startActiveSpan('openai.plan', {
    attributes: {
      prompt,
    }
  }, async (span) => {
    const chatCompletion = await openAICompletion(PLAN2, prompt);
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
}


const PLAN3 = readFileSync("./src/prompts/plan3.txt", "utf-8");

export async function runPlan3(bot: Bot, message: string, lastTask: string | null, lastCritique: string | null) {
  const tracer = trace.getTracer('voyager')

  const prompt = `
  ${getBasicObservations(bot)}
  Project: ${message}
  Last Task: ${lastTask || "(None)"}
  Last Critique: ${lastCritique || "(None)"}
      `;  

  console.log("\n====PROMPT=====")
  console.log(prompt)
  console.log("================\n")

  return await tracer.startActiveSpan('openai.plan', {
    attributes: {
      prompt,
    }
  }, async (span) => {
    const chatCompletion = await openAICompletion(PLAN3, prompt);
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
}


export async function openAICompletion(system: string, prompt: string) {
  
  return await openai.createChatCompletion({
    model: "gpt-4",
    // model: "gpt-3.5-turbo",
    messages: [
      {role: "system", content: system},
      {role: "user", content: prompt}
    ],
  });   
}
