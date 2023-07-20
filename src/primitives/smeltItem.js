async function smeltItem(bot, obs, itemName, fuelName, count = 1) {
  // return if itemName or fuelName is not string
  if (typeof itemName !== "string" || typeof fuelName !== "string") {
      throw new Error("itemName or fuelName for smeltItem must be a string");
  }
  // return if count is not a number
  if (typeof count !== "number") {
      throw new Error("count for smeltItem must be a number");
  }
  const item = bot.registry.itemsByName[itemName];
  const fuel = bot.registry.itemsByName[fuelName];
  if (!item) {
      throw new Error(`No item named ${itemName}`);
  }
  if (!fuel) {
      throw new Error(`No item named ${fuelName}`);
  }
  const furnaceBlock = bot.findBlock({
      matching: bot.registry.blocksByName.furnace.id,
      maxDistance: 32,
  });
  if (!furnaceBlock) {
      throw new Error("No furnace nearby");
  } else {
      await bot.pathfinder.goto(
          new GoalLookAtBlock(furnaceBlock.position, bot.world)
      );
  }
  const furnace = await bot.openFurnace(furnaceBlock);
  let success_count = 0;
  for (let i = 0; i < count; i++) {
      if (!bot.inventory.findInventoryItem(item.id, null)) {
          obs.chat(`No ${itemName} to smelt in inventory`);
          break;
      }
      if (furnace.fuelSeconds < 15 && furnace.fuelItem()?.name !== fuelName) {
          if (!bot.inventory.findInventoryItem(fuel.id, null)) {
              obs.chat(`No ${fuelName} as fuel in inventory`);
              break;
          }
          await furnace.putFuel(fuel.id, null, 1);
          await bot.waitForTicks(20);
          if (!furnace.fuel && furnace.fuelItem()?.name !== fuelName) {
              throw new Error(`${fuelName} is not a valid fuel`);
          }
      }
      await furnace.putInput(item.id, null, 1);
      await bot.waitForTicks(12 * 20);
      if (!furnace.outputItem()) {
          throw new Error(`${itemName} is not a valid input`);
      }
      await furnace.takeOutput();
      success_count++;
  }
  furnace.close();
  if (success_count > 0) obs.chat(`Smelted ${success_count} ${itemName}.`);
  else {
      obs.chat(
          `Failed to smelt ${itemName}, please check the fuel and input.`
      );
      _smeltItemFailCount++;
      if (_smeltItemFailCount > 10) {
          throw new Error(
              `smeltItem failed too many times, please check the fuel and input.`
          );
      }
  }
}
