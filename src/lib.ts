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