import * as mineflayer from 'mineflayer';
import { mineflayer as  mineflayerViewer } from 'prismarine-viewer';
import { goals } from "mineflayer-pathfinder";
import inventoryViewer from 'mineflayer-web-inventory'
import { runExec } from './exec';
import Observer from './obs';
import stringArgv from 'string-argv';
import PlanManager from './plan';

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'durchen',
  accessToken: '123'
});

const planManager = new PlanManager(bot);

/**
 * Fetch next command
 */
bot.on('chat', async (username, message) => {
  if (username === bot.username) return

  if(message.startsWith('!')) {
    const parsed = stringArgv(message)

    if (parsed[0] === '!leash')  {

      let goal;
      if (parsed.length === 4) {
        goal = {
          x: parseFloat(parsed[1]),
          y: parseFloat(parsed[2]), 
          z: parseFloat(parsed[3]),
        }
      } else {
        const jurchenPosition = bot.players['jurchen']?.entity?.position;
        if(!jurchenPosition) {
          bot.chat('I cant see you')
          return
        }
        goal = jurchenPosition;
      }
      bot.chat('going to ' + goal.x + ' ' + goal.y + ' ' + goal.z);    
      bot.pathfinder.setGoal(new goals.GoalNear(goal.x, goal.y, goal.z, 1));
      return;
    }

    if (parsed[0] === '!debug')  {
      const code = `
      async function craftCraftingTable(bot) {
        // get the item counts in inventory
        var planksCount = bot.inventory.count("oak_planks");
        var logCount = bot.inventory.count("oak_log");
    
        // check if we have enough planks ready else we craft planks from log
        if(planksCount < 4){
            await craftItem(bot, "oak_planks", Math.ceil((4 - planksCount)/4));
            planksCount = bot.inventory.count("oak_planks"); 
        }
    
        if(planksCount >= 4){
            await craftItem(bot, "crafting_table", 1);
        }else{
            obs.chat("Cannot craft crafting table due to lack of oak planks");
        }
    }
      `

      // create observability object

      const obs = new Observer(bot)
      await runExec(bot, obs, code)

      // TODO: can test repairs
      console.warn(obs.error.toString())
      console.warn(obs.error.message)
      console.warn(obs.error.name)
      console.warn(obs.error.stack)

      return;
    }

    bot.chat('unknown command')
    return;
  }

  /**
   * GPT
   */
  // await planCompletion(bot, message);
  await planManager.runProject(message);
  // await runCompletion(bot, message);
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)


// take in text
bot.once('spawn', () => {
  const { pathfinder } = require("mineflayer-pathfinder");
  const tool = require("mineflayer-tool").plugin;
  const collectBlock = require("./collectblock").plugin;
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
