import * as fs from 'fs'
import { Configuration, OpenAIApi } from "openai";

import { getEntities, getEquipment, getSurroundingBlocks, getTime } from './lib';

import * as babel from '@babel/core';

import 'dotenv/config'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const PROMPT = fs.readFileSync("./src/prompt.txt", "utf-8");

const CRAFT_HELPER = fs.readFileSync("./src/primitives/craftHelper.js", "utf-8");
const CRAFT_ITEM = fs.readFileSync("./src/primitives/craftItem.js", "utf-8");
const EXPLORE_UNTIL = fs.readFileSync("./src/primitives/exploreUntil.js", "utf-8");
const GIVE_PLACED_ITEM_BACK = fs.readFileSync("./src/primitives/givePlacedItemBack.js", "utf-8");
const KILL_MOB = fs.readFileSync("./src/primitives/killMob.js", "utf-8");
const MINE_BLOCK = fs.readFileSync("./src/primitives/mineBlock.js", "utf-8");
const PLACE_ITEM = fs.readFileSync("./src/primitives/placeItem.js", "utf-8");
const SHOOT = fs.readFileSync("./src/primitives/shoot.js", "utf-8");
const SMELT_ITEM = fs.readFileSync("./src/primitives/smeltItem.js", "utf-8");
const USE_CHEST = fs.readFileSync("./src/primitives/useChest.js", "utf-8");
const WAIT_FOR_MOB_REMOVED = fs.readFileSync("./src/primitives/waitForMobRemoved.js", "utf-8");

async function runPrompt(bot, task, previousCode = null, previousError = null) {
  const inventoryUsed = bot.inventory.slots.filter((slot) => slot).length
  const inventory = bot.inventory.items().map((item) => `${item.name}:${item.count}`).join(', ')
  const biome = bot.blockAt(bot.entity.position)?.biome?.name || 'Unknown'
  const time = getTime(bot);
  const equipment = getEquipment(bot).join(', ');
  const entities = getEntities(bot); // TODO: figure out mapping dict
  const blocks = [...getSurroundingBlocks(bot, 8, 2, 8)]

  const prompt = `
    Code from the last round: ${previousCode || "(None)"}
    Execution error: ${previousError || "(None)"}
    Chat log: (None)
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

  console.warn('===CODE===')
//   const code = `  
// `
  console.warn(code)
  const parsed = babel.parse(code).program.body
  console.warn('=========')

  // first function is what gets run
  // TODO: handle multiple functions
  const functionName = parsed[0].id.name;

  // TODO: cleaner env definition
  const program = `
  const { goals } = require('mineflayer-pathfinder');
  const { GoalPlaceBlock, GoalNear, GoalNearXZ, GoalXZ, GoalGetToBlock, GoalFollow, GoalLookAtBlock } = goals;
  const { Vec3 } = require('vec3');

  ${CRAFT_HELPER}
  ${CRAFT_ITEM}
  ${EXPLORE_UNTIL}
  ${GIVE_PLACED_ITEM_BACK}
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

  ${functionName}(bot);
  `;

  try {
    bot.chat(`Running code`);
    await eval(program)
    return [null, code];
  } catch(e) {
    bot.chat(`I failed to run your code ${e.message}`)
    return [e, code];
  }
}


export async function runCompletion(bot, message) {
  const [e, code] = await runPrompt(bot, message)

  if(e) {
    // try again
    const [e2, _] = await runPrompt(bot, message, code, e.toString())
    if (e2) {
      console.warn(e2)
      bot.chat('I failed to run your code twice, I give up.')
    }
  }
}
