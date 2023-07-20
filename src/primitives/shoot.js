// shoot 1 pig with a bow: shoot(bot, "bow", "pig");
async function shoot(bot, obs, weapon, target) {
  const validWeapons = [
      "bow",
      "crossbow",
      "snowball",
      "ender_pearl",
      "egg",
      "splash_potion",
      "trident",
  ];
  if (!validWeapons.includes(weapon)) {
      obs.chat(`${weapon} is not a valid weapon for shooting`);
      return;
  }

  const weaponItem = bot.registry.itemsByName[weapon];
  if (!bot.inventory.findInventoryItem(weaponItem.id, null)) {
      obs.chat(`No ${weapon} in inventory for shooting`);
      return;
  }

  const targetEntity = bot.nearestEntity(
      (entity) =>
          entity.name === target
  );
  if (!targetEntity) {
      obs.chat(`No ${target} nearby`);
      return;
  }
  bot.hawkEye.autoAttack(targetEntity, "bow");
  bot.on('auto_shot_stopped', (target) => {
  })
}
