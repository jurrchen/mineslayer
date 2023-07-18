import * as mineflayer from 'mineflayer';
import { mineflayer as  mineflayerViewer } from 'prismarine-viewer';

import 'dotenv/config'

const { Configuration, OpenAIApi } = require("openai");

import { goals } from "mineflayer-pathfinder";

import * as inventoryViewer from 'mineflayer-web-inventory'
import * as fs from 'fs'

import mineWoodLog from './primitives/mineWoodLog';
import { getEntities, getEquipment, getSurroundingBlocks, getTime } from './lib';


import * as babel from '@babel/core';

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'durchen',
  accessToken: '123'
});

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const PROMPT = fs.readFileSync("./src/prompt.txt", "utf-8");

const CRAFT_HELPER = fs.readFileSync("./src/primitives2/craftHelper.js", "utf-8");
const CRAFT_ITEM = fs.readFileSync("./src/primitives2/craftItem.js", "utf-8");
const EXPLORE_UNTIL = fs.readFileSync("./src/primitives2/exploreUntil.js", "utf-8");
const GIVE_PLACED_ITEM_BACK = fs.readFileSync("./src/primitives2/givePlacedItemBack.js", "utf-8");
const KILL_MOB = fs.readFileSync("./src/primitives2/killMob.js", "utf-8");
const MINE_BLOCK = fs.readFileSync("./src/primitives2/mineBlock.js", "utf-8");
const PLACE_ITEM = fs.readFileSync("./src/primitives2/placeItem.js", "utf-8");
const SHOOT = fs.readFileSync("./src/primitives2/shoot.js", "utf-8");
const SMELT_ITEM = fs.readFileSync("./src/primitives2/smeltItem.js", "utf-8");
const USE_CHEST = fs.readFileSync("./src/primitives2/useChest.js", "utf-8");
const WAIT_FOR_MOB_REMOVED = fs.readFileSync("./src/primitives2/waitForMobRemoved.js", "utf-8");

/**
 * Fetch next command
 */
bot.on('chat', async (username, message) => {
  if (username === bot.username) return

  // ping open ai
  // const resA = await model.call(
  //   message
  // );
  // turn code into commands
  // console.warn(username, message, resA)

  if (message === 'mine') {
    mineWoodLog(bot)
    return;
  }

  if (message === 'leash') {
    const jurchenPosition = bot.players['jurchen']?.entity?.position;
    if(!jurchenPosition) {
      bot.chat('I cant see you')
      return
    }
    bot.chat('jurchen is at ' + jurchenPosition);    
    bot.pathfinder.setGoal(new goals.GoalNear(jurchenPosition.x, jurchenPosition.y, jurchenPosition.z, 1))
    return;
  }

  /**
   * GPT
   */
  const inventoryUsed = bot.inventory.slots.filter((slot) => slot).length
  const inventory = bot.inventory.items().map((item) => `${item.name}:${item.count}`).join(', ')
  const biome = bot.blockAt(bot.entity.position)?.biome?.name || 'Unknown'
  const time = getTime(bot);
  const equipment = getEquipment(bot).join(', ');
  const entities = getEntities(bot); // TODO: figure out mapping dict
  const blocks = [...getSurroundingBlocks(bot, 8, 2, 8)]

  console.warn(entities)

  const prompt = `
    Code from the last round: (None)
    Execution error: (None)
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
    Task: ${message}
  `

  bot.chat('I am thinking...')

  console.log("\n\n\n\n")
  console.log(prompt)
  console.log("\n\n\n\n")

  // const chatCompletion = await openai.createChatCompletion({
  //   model: "gpt-4",
  //   messages: [
  //     {role: "system", content: PROMPT},
  //     {role: "user", content: `Task: ${message}`}
  //   ],
  // }); 

  // const responseContent = chatCompletion.data.choices[0].message.content;

  // console.log(responseContent);

  // switch to using regex
  // const code = responseContent.split("Code:\n```javascript")[1].slice(0, -3);

  const code = `
  async function craftAndPlaceCraftingTable(bot) {
    // Check if crafting_table is already present
    let craftingTable = bot.inventory.findInventoryItem(bot.registry.itemsByName["crafting_table"].id);
    if (craftingTable) {
        bot.chat("Crafting table found in inventory");
        await placeItem(bot, "crafting_table", bot.entity.position.offset(1, 0, 0));
    } else {
        bot.chat("Crafting table not found in inventory. Checking for oak log...");
        let oakLog = bot.inventory.findInventoryItem(bot.registry.itemsByName["oak_log"].id);
        if (oakLog) {
            bot.chat("Oak logs found in inventory. Crafting crafting_table...");
        } else {            
            bot.chat("Oak logs not found in inventory. Mining oak_log...");
            await mineBlock(bot, "oak_log", 1);
            bot.chat("Finished mining oak logs. Crafting crafting_table...");
        }
        await craftItem(bot, "crafting_table", 1);    
        bot.chat("Finished crafting crafting_table. Placing the crafting_table...");
        await placeItem(bot, "crafting_table", bot.entity.position.offset(1, 0, 0));
    }
    bot.chat("Crafting table placed successfully.");
}
`
  const parsed = babel.parse(code).program.body

  // last async function
  const functionName = parsed[0].id.name


  // parse code, check validity

  // get the function name

  console.log(code);

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

  console.log(program)
  eval(program)
})

bot.on('goal_reached', (goal) => {
  bot.chat('I here')
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)


// take in text
bot.once('spawn', () => {
  const { pathfinder } = require("mineflayer-pathfinder");
  const tool = require("mineflayer-tool").plugin;
  const collectBlock = require("mineflayer-collectblock").plugin;
  const pvp = require("mineflayer-pvp").plugin;
  const minecraftHawkEye = require("minecrafthawkeye");
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(tool);
  bot.loadPlugin(collectBlock);
  bot.loadPlugin(pvp);
  bot.loadPlugin(minecraftHawkEye);

  inventoryViewer(bot, {
    port: 3006
  })

  mineflayerViewer(bot, { 
    port: 3007
  })
});
