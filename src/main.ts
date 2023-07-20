import * as mineflayer from 'mineflayer';
import { mineflayer as  mineflayerViewer } from 'prismarine-viewer';
import { goals } from "mineflayer-pathfinder";
import inventoryViewer from 'mineflayer-web-inventory'
import { runCompletion, runExec } from './run';
import Observer from './obs';
import stringArgv from 'string-argv';

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'durchen',
  accessToken: '123'
});



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
async function mineOre(bot, obs) {
  await mineBlock(bot, obs, "diamond_ore", 1);
  bot.chat('mined ore')
}
      `

      // create observability object

      const obs = new Observer(bot)
      await runExec(bot, obs, code)

      // TODO: can test repairs

      return;
    }

    bot.chat('unknown command')
    return;
  }

  /**
   * GPT
   */
  // await planCompletion(bot, message);
  await runCompletion(bot, message);
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
