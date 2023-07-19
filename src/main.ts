import * as mineflayer from 'mineflayer';
import { mineflayer as  mineflayerViewer } from 'prismarine-viewer';
import { goals } from "mineflayer-pathfinder";
import * as inventoryViewer from 'mineflayer-web-inventory'
import { runCompletion } from './runCompletion';

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
  await runCompletion(bot, message);
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
