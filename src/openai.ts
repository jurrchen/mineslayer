import { Configuration, OpenAIApi } from "openai";

import 'dotenv/config'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});
const openai = new OpenAIApi(configuration);


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
