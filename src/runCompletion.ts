import * as fs from 'fs'
import { Configuration, OpenAIApi } from "openai";

import { getEntities, getEquipment, getSurroundingBlocks, getTime } from './lib';

import * as babel from '@babel/core';

import 'dotenv/config'
import Observer from './obs';
import { Bot } from 'mineflayer';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const PROMPT = fs.readFileSync("./src/prompt.txt", "utf-8");

const CRAFT_HELPER = fs.readFileSync("./src/primitives/craftHelper.js", "utf-8");
const CRAFT_ITEM = fs.readFileSync("./src/primitives/craftItem.js", "utf-8");
const EXPLORE_UNTIL = fs.readFileSync("./src/primitives/exploreUntil.js", "utf-8");
const KILL_MOB = fs.readFileSync("./src/primitives/killMob.js", "utf-8");
const MINE_BLOCK = fs.readFileSync("./src/primitives/mineBlock.js", "utf-8");
const PLACE_ITEM = fs.readFileSync("./src/primitives/placeItem.js", "utf-8");
const SHOOT = fs.readFileSync("./src/primitives/shoot.js", "utf-8");
const SMELT_ITEM = fs.readFileSync("./src/primitives/smeltItem.js", "utf-8");
const USE_CHEST = fs.readFileSync("./src/primitives/useChest.js", "utf-8");
const WAIT_FOR_MOB_REMOVED = fs.readFileSync("./src/primitives/waitForMobRemoved.js", "utf-8");

async function runPrompt(bot: Bot, obs: Observer, task: string, previousObs: Observer | null = null) {
  const inventoryUsed = bot.inventory.slots.filter((slot) => slot).length
  const inventory = bot.inventory.items().map((item) => `${item.name}:${item.count}`).join(', ')
  const biome = bot.blockAt(bot.entity.position)?.biome?.name || 'Unknown'
  const time = getTime(bot);
  const equipment = getEquipment(bot).join(', ');
  const entities = getEntities(bot); // TODO: figure out mapping dict
  const blocks = [...getSurroundingBlocks(bot, 8, 2, 8)]

  const prompt = `
    Code from the last round: ${previousObs?.code || "(None)"}
    Execution error: ${previousObs?.error?.toString() || "(None)"}
    Chat log: ${previousObs?.logs.join('\n') || "(None)"}
    Biome: ${biome}
    Time: ${time}
    Nearby blocks: ${blocks}
    Nearby entities (nearest to farthest): ${JSON.stringify(entities)}
    Health: ${bot.health}/20
    Hunger: ${bot.food}/20
    Position: x=${bot.entity.position.x}, y=${bot.entity.position.y}, z=${bot.entity.position.z}
    Inventory (${inventoryUsed}/36): ${inventory}
    Equipment: ${equipment}
    Chests: (Unknown)
    Task: ${task}
  `

  bot.chat('I am thinking...')

  console.log("\n\n\n\n")
  console.log(prompt)
  console.log("\n\n\n\n")

  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      {role: "system", content: PROMPT},
      {role: "user", content: prompt}
    ],
  }); 

  const responseContent = chatCompletion.data.choices[0].message.content;

  console.log(responseContent);

  // switch to using regex
  const code = responseContent.split("```javascript")[1].trim().slice(0, -3)

  return runExec(bot, obs, code)
}


function getFunctionName(code: string) {
  const parsed = babel.parse(code).program.body
  return parsed.reverse()[0].id.name;
}


export async function runExec(bot: Bot, obs: Observer, code: string) {
  obs.setCode(code)
  const parsed = babel.parse(code).program.body

  // first function is what gets run
  // TODO: handle multiple functions
  const functionName = getFunctionName(code)

  // TODO: cleaner env definition
  const program = `
  const { goals } = require('mineflayer-pathfinder');
  const { GoalPlaceBlock, GoalNear, GoalNearXZ, GoalXZ, GoalGetToBlock, GoalFollow, GoalLookAtBlock } = goals;
  const { Vec3 } = require('vec3');

  ${CRAFT_HELPER}
  ${CRAFT_ITEM}
  ${EXPLORE_UNTIL}
  ${KILL_MOB}
  ${MINE_BLOCK}
  ${PLACE_ITEM}
  ${SHOOT}
  ${SMELT_ITEM}
  ${USE_CHEST}
  ${WAIT_FOR_MOB_REMOVED}

  let _mineBlockFailCount = 0;
  let _placeItemFailCount = 0;
  let _craftItemFailCount = 0;
  let _killMobFailCount = 0;
  let _smeltItemFailCount = 0;

  ${code}

  ${functionName}(bot, obs);
  `;

  try {
    bot.chat('Running code');
    await eval(program)
    bot.chat('Done.')
  } catch(e) {
    obs.setError(e)
    return e
  }
}


export async function runCompletion(bot, message) {
  const obs = new Observer(bot)
  const e = await runPrompt(bot, obs, message)
  // check obs?

  if(e) {
    // try again
    const obs2 = new Observer(bot)
    const e2 = await runPrompt(bot, obs2, message, obs)
    if (e2) {
      bot.chat('I failed to run your code twice, I give up.')
    }
  }
}
