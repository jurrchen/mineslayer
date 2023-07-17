import * as mineflayer from 'mineflayer';
import { mineflayer as  mineflayerViewer } from 'prismarine-viewer';

import 'dotenv/config'

import { OpenAI } from "langchain/llms/openai";

import { goals } from "mineflayer-pathfinder";
import { Vec3 } from 'vec3';

import * as inventoryViewer from 'mineflayer-web-inventory'

const mcData = require('minecraft-data')('1.19.4')

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'durchen',
  accessToken: '123'
});

const model = new OpenAI({
  modelName: "gpt-4",
});

/**
 * Fetch next command
 */
let _mineBlockFailCount = 0;

// Explore downward for 60 seconds: exploreUntil(bot, new Vec3(0, -1, 0), 60);
async function exploreUntil(
  bot,
  direction,
  maxTime = 60,
  callback = () => {
      return false;
  }
) {
  if (typeof maxTime !== "number") {
      throw new Error("maxTime must be a number");
  }
  if (typeof callback !== "function") {
      throw new Error("callback must be a function");
  }
  const test = callback();
  if (test) {
      bot.chat("Explore success.");
      return Promise.resolve(test);
  }
  if (direction.x === 0 && direction.y === 0 && direction.z === 0) {
      throw new Error("direction cannot be 0, 0, 0");
  }
  if (
      !(
          (direction.x === 0 || direction.x === 1 || direction.x === -1) &&
          (direction.y === 0 || direction.y === 1 || direction.y === -1) &&
          (direction.z === 0 || direction.z === 1 || direction.z === -1)
      )
  ) {
      throw new Error(
          "direction must be a Vec3 only with value of -1, 0 or 1"
      );
  }
  maxTime = Math.min(maxTime, 1200);
  return new Promise((resolve, reject) => {
      const dx = direction.x;
      const dy = direction.y;
      const dz = direction.z;

      let explorationInterval;
      let maxTimeTimeout;

      const cleanUp = () => {
          clearInterval(explorationInterval);
          clearTimeout(maxTimeTimeout);
          bot.pathfinder.setGoal(null);
      };

      const explore = () => {
          const x =
              bot.entity.position.x +
              Math.floor(Math.random() * 20 + 10) * dx;
          const y =
              bot.entity.position.y +
              Math.floor(Math.random() * 20 + 10) * dy;
          const z =
              bot.entity.position.z +
              Math.floor(Math.random() * 20 + 10) * dz;
          let goal: any = new goals.GoalNear(x, y, z, 1);
          if (dy === 0) {
              goal = new goals.GoalNearXZ(x, z, 1);
          }
          bot.pathfinder.setGoal(goal);

          try {
              const result = callback();
              if (result) {
                  cleanUp();
                  bot.chat("Explore success.");
                  resolve(result);
              }
          } catch (err) {
              cleanUp();
              reject(err);
          }
      };

      explorationInterval = setInterval(explore, 2000);

      maxTimeTimeout = setTimeout(() => {
          cleanUp();
          bot.chat("Max exploration time reached");
          resolve(null);
      }, maxTime * 1000);
  });
}

function failedCraftFeedback(bot, name, item, craftingTable) {
  const recipes = bot.recipesAll(item.id, null, craftingTable);
  if (!recipes.length) {
      throw new Error(`No crafting table nearby`);
  } else {
      const recipes = bot.recipesAll(
          item.id,
          null,
          mcData.blocksByName.crafting_table.id
      );
      // find the recipe with the fewest missing ingredients
      var min = 999;
      var min_recipe = null;
      for (const recipe of recipes) {
          const delta = recipe.delta;
          var missing = 0;
          for (const delta_item of delta) {
              if (delta_item.count < 0) {
                  const inventory_item = bot.inventory.findInventoryItem(
                      mcData.items[delta_item.id].name,
                      null
                  );
                  if (!inventory_item) {
                      missing += -delta_item.count;
                  } else {
                      missing += Math.max(
                          -delta_item.count - inventory_item.count,
                          0
                      );
                  }
              }
          }
          if (missing < min) {
              min = missing;
              min_recipe = recipe;
          }
      }
      const delta = min_recipe.delta;
      let message = "";
      for (const delta_item of delta) {
          if (delta_item.count < 0) {
              const inventory_item = bot.inventory.findInventoryItem(
                  mcData.items[delta_item.id].name,
                  null
              );
              if (!inventory_item) {
                  message += ` ${-delta_item.count} more ${
                      mcData.items[delta_item.id].name
                  }, `;
              } else {
                  if (inventory_item.count < -delta_item.count) {
                      message += `${
                          -delta_item.count - inventory_item.count
                      } more ${mcData.items[delta_item.id].name}`;
                  }
              }
          }
      }
      bot.chat(`I cannot make ${name} because I need: ${message}`);
  }
}

async function craftItem(bot, name, count = 1) {
  // return if name is not string
  if (typeof name !== "string") {
      throw new Error("name for craftItem must be a string");
  }
  // return if count is not number
  if (typeof count !== "number") {
      throw new Error("count for craftItem must be a number");
  }
  const itemByName = mcData.itemsByName[name];
  if (!itemByName) {
      throw new Error(`No item named ${name}`);
  }
  const craftingTable = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32,
  });
  if (!craftingTable) {
      bot.chat("Craft without a crafting table");
  } else {
      await bot.pathfinder.goto(
          new goals.GoalLookAtBlock(craftingTable.position, bot.world)
      );
  }
  const recipe = bot.recipesFor(itemByName.id, null, 1, craftingTable)[0];
  if (recipe) {
      bot.chat(`I can make ${name}`);
      try {
          await bot.craft(recipe, count, craftingTable);
          bot.chat(`I did the recipe for ${name} ${count} times`);
      } catch (err) {
          bot.chat(`I cannot do the recipe for ${name} ${count} times`);
      }
  } else {
      failedCraftFeedback(bot, name, itemByName, craftingTable);
      // _craftItemFailCount++;
      // if (_craftItemFailCount > 10) {
      //     throw new Error(
      //         "craftItem failed too many times, check chat log to see what happened"
      //     );
      // }
  }
}


// async function checkForCrafting(bot, log, plank) {
//   const plankCount = bot.inventory.count(plank);

//   if (plankCount < 4) {
//     const logsCount = bot.inventory.count(log);
//     const planksToCraft = Math.ceil((4 - plankCount) / 4);
//     if (logsCount >= planksToCraft) {
//       await craftItem(bot, "oak_planks", planksToCraft);
//       bot.chat("Crafted oak planks.");
//     } else {
//       bot.chat("Not enough oak logs to craft oak planks.", logsCount);
//       return;
//     }
//   }  
// }

async function craftCraftingTable(bot) {
  // Check if there are enough oak planks in the inventory
  const oakPlanksCount = bot.inventory.count(mcData.itemsByName.acacia_planks.id);

  // If not, craft oak planks from oak logs
  if (oakPlanksCount < 4) {
    const oakLogsCount = bot.inventory.count(mcData.itemsByName.acacia_log.id);
    const planksToCraft = Math.ceil((4 - oakPlanksCount) / 4);
    if (oakLogsCount >= planksToCraft) {
      await craftItem(bot, "oak_planks", planksToCraft);
      bot.chat("Crafted oak planks.");
    } else {
      bot.chat(`Not enough oak logs to craft oak planks. ${oakLogsCount}`, );
      return;
    }
  }

  // Craft a crafting table using oak planks
  await craftItem(bot, "crafting_table", 1);
  bot.chat("Crafted a crafting table.");
}

async function mineBlock(bot, name, count = 1) {
  bot.chat(`Mining ${name}`);
  // return if name is not string
  if (typeof name !== "string") {
      throw new Error(`name for mineBlock must be a string`);
  }
  if (typeof count !== "number") {
      throw new Error(`count for mineBlock must be a number`);
  }
  const blockByName = mcData.blocksByName[name];
  if (!blockByName) {
      throw new Error(`No block named ${name}`);
  }
  const blocks = bot.findBlocks({
      matching: [blockByName.id],
      maxDistance: 32,
      count: 1024,
  });
  if (blocks.length === 0) {
      bot.chat(`No ${name} nearby, please explore first`);
      _mineBlockFailCount++;
      if (_mineBlockFailCount > 10) {
          throw new Error(
              "mineBlock failed too many times, make sure you explore before calling mineBlock"
          );
      }
      return;
  } else {
    bot.chat(`Found ${blocks.length} ${name} nearby`)
  }
  const targets = [];
  for (let i = 0; i < blocks.length; i++) {
      targets.push(bot.blockAt(blocks[i]));
  }

  bot.chat(`Collecting ${targets.length} ${name}`)
  try {
    await bot.collectBlock.collect(targets, {
        ignoreNoPath: true,
        count: count,
    });
  } catch(err) {
    console.log(err)
  }
  // bot.save(`${name}_mined`);
}

async function mineWoodLog(bot) {
  const woodLogNames = ["oak_log", "birch_log", "spruce_log", "jungle_log", "acacia_log", "dark_oak_log", "mangrove_log"];

  // Find a wood log block
  const woodLogBlock: any = await exploreUntil(bot, new Vec3(1, 0, 1), 60, () => {
    return bot.findBlock({
      matching: block => woodLogNames.includes(block.name),
      maxDistance: 32
    });
  });
  if (!woodLogBlock) {
    bot.chat("Could not find a wood log.");
    return;
  }

  // Mine the wood log block
  await mineBlock(bot, woodLogBlock.name, 1);
  bot.chat("Wood log mined.");
}

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

  if(message == 'explore') {
    exploreUntil(bot, new Vec3(1, 0, 0), 5);
    return;
  }

  if (message = 'leash') {
    const jurchenPosition = bot.players['jurchen']?.entity?.position;
    if(!jurchenPosition) {
      bot.chat('I cant see you')
      return
    }
    bot.chat('jurchen is at ' + jurchenPosition);    
    bot.pathfinder.setGoal(new goals.GoalNear(jurchenPosition.x, jurchenPosition.y, jurchenPosition.z, 1))
  }

  if(message == 'what') {
    bot.chat(`I have ${bot.inventory.items().length} items`)
    const logsCount = bot.inventory.count(mcData.itemsByName.acacia_log.id, null);
    bot.chat(`I have ${logsCount} logs`)
    return;
  }

  if (message === 'craft') {
    craftCraftingTable(bot);
    return;
  }

  // bot.chat(resA)
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
