import * as mineflayer from 'mineflayer';
import { mineflayer as  mineflayerViewer } from 'prismarine-viewer';

import 'dotenv/config'

const { Configuration, OpenAIApi } = require("openai");

import { goals } from "mineflayer-pathfinder";

import * as inventoryViewer from 'mineflayer-web-inventory'
import * as fs from 'fs'

import mineBlock from './primitives/mineBlock';
import mineWoodLog from './primitives/mineWoodLog';
import { getEntities, getEquipment, getSurroundingBlocks } from './lib';

const mcData = require('minecraft-data')('1.19.4')

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
  const timeOfDay = bot.time.timeOfDay;
  let time = "(unknown)";
  if (timeOfDay < 1000) {
    time = "sunrise";
  } else if (timeOfDay < 6000) {
    time = "day";
  } else if (timeOfDay < 12000) {
    time = "noon";
  } else if (timeOfDay < 13000) {
    time = "sunset";
  } else if (timeOfDay < 18000) {
    time = "night";
  } else if (timeOfDay < 22000) {
    time = "midnight";
  } else {
    time = "sunrise";
  }

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

  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      {role: "system", content: PROMPT},
      {role: "user", content: `Task: ${message}`}
    ],
  }); 

  const responseContent = chatCompletion.data.choices[0].message.content;

  console.log(responseContent);

  const code = responseContent.split("Code:\n```javascript")[1];

  console.log(code);

  eval('bot.chat("hello")')
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
