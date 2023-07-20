async function craftItem(bot, obs, name, count = 1) {
  // return if name is not string
  if (typeof name !== "string") {
      throw new Error("name for craftItem must be a string");
  }
  // return if count is not number
  if (typeof count !== "number") {
      throw new Error("count for craftItem must be a number");
  }
  const itemByName = bot.registry.itemsByName[name];
  if (!itemByName) {
      throw new Error(`No item named ${name}`);
  }
  const craftingTable = bot.findBlock({
      matching: bot.registry.blocksByName.crafting_table.id,
      maxDistance: 32,
  });
  if (!craftingTable) {
      obs.chat("Craft without a crafting table");
  } else {
      await bot.pathfinder.goto(
          new GoalLookAtBlock(craftingTable.position, bot.world)
      );
  }
  const recipe = bot.recipesFor(itemByName.id, null, 1, craftingTable)[0];
  if (recipe) {
      obs.chat(`I can make ${name}`);
      try {
          await bot.craft(recipe, count, craftingTable);
          obs.chat(`I did the recipe for ${name} ${count} times`);
      } catch (err) {
          obs.chat(`I cannot do the recipe for ${name} ${count} times`);
      }
  } else {
      failedCraftFeedback(bot, obs, name, itemByName, craftingTable);
      _craftItemFailCount++;
      if (_craftItemFailCount > 10) {
          throw new Error(
              "craftItem failed too many times, check chat log to see what happened"
          );
      }
  }
}
