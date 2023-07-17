import { goals } from "mineflayer-pathfinder";

async function mineBlock(mcData, bot, name, count = 1) {
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