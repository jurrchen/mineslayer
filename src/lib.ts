export function getEntities(bot) {
  const entities = bot.entities;
  if (!entities) return {};
  // keep all monsters in one list, keep other mobs in another list
  const mobs = {};
  for (const id in entities) {
      const entity = entities[id];
      if (!entity.displayName) continue;
      if (entity.name === "player" || entity.name === "item") continue;
      if (entity.position.distanceTo(bot.entity.position) < 32) {
          if (!mobs[entity.name]) {
              mobs[entity.name] = entity.position.distanceTo(
                  bot.entity.position
              );
          } else if (
              mobs[entity.name] >
              entity.position.distanceTo(bot.entity.position)
          ) {
              mobs[entity.name] = entity.position.distanceTo(
                  bot.entity.position
              );
          }
      }
  }
  return mobs;

}

export function getEquipment(bot) {
  const slots = bot.inventory.slots;
  const mainHand = bot.heldItem;
  return slots
      .slice(5, 9)
      .concat(mainHand, slots[45])
      .map((item) => (item ? item.name : "empty"));  
}

export function getSurroundingBlocks(bot, x_distance, y_distance, z_distance) {
  const surroundingBlocks = new Set();

  for (let x = -x_distance; x <= x_distance; x++) {
      for (let y = -y_distance; y <= y_distance; y++) {
          for (let z = -z_distance; z <= z_distance; z++) {
              const block = bot.blockAt(bot.entity.position.offset(x, y, z));
              if (block && block.type !== 0) {
                  surroundingBlocks.add(block.name);
              }
          }
      }
  }
  // console.log(surroundingBlocks);
  return surroundingBlocks;
}

// Needs to remember chests
export function getChests(bot) {
  const chests = bot.findBlocks({
      matching: bot.registry.blocksByName.chest.id,
      maxDistance: 16,
      count: 999,
  });
  chests.forEach((chest) => {
      if (!this.chestsItems.hasOwnProperty(chest)) {
          this.chestsItems[chest] = "Unknown";
      }
  });
  return this.chestsItems;
}

export function getTime(bot) {
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

  return time;
}

export function getBasicObservations(bot) {
  const inventoryUsed = bot.inventory.slots.filter((slot) => slot).length
  const inventory = bot.inventory.items().map((item) => `${item.name}:${item.count}`).join(', ')
  const biome = bot.blockAt(bot.entity.position)?.biome?.name || 'Unknown'
  const time = getTime(bot);
  const equipment = getEquipment(bot).join(', ');
  const entities = getEntities(bot); // TODO: figure out mapping dict
  const blocks = [...getSurroundingBlocks(bot, 8, 2, 8)]

  const craftingTable = bot.findBlock({
    matching: bot.registry.blocksByName.crafting_table.id,
    within: 32,
  });

  const furnace = bot.findBlock({
    matching: bot.registry.blocksByName.furnace.id,
    within: 32,
  });

  const craftingTablePos = craftingTable ? `x=${craftingTable.position.x}, y=${craftingTable.position.y}, z=${craftingTable.position.z}` : '(None)'
  const furnacePos = furnace ? `x=${furnace.position.x}, y=${furnace.position.y}, z=${furnace.position.z}` : '(None)'
  
  const observations = `Biome: ${biome}
Time: ${time}
Nearby blocks: ${blocks}
Nearby entities (nearest to farthest): ${JSON.stringify(entities)}
Nearby crafting table: ${craftingTablePos}
Nearby furnace: ${furnacePos}
Health: ${bot.health}/20
Hunger: ${bot.food}/20
Position: x=${bot.entity.position.x}, y=${bot.entity.position.y}, z=${bot.entity.position.z}
Inventory (${inventoryUsed}/36): ${inventory}
Equipment: ${equipment}
Chests: (Unknown)`;

  return observations;
}