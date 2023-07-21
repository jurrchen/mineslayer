import * as fs from 'fs'
import { Bot } from 'mineflayer';
import Observer from './obs';
import * as babel from '@babel/core';

const CRAFT_HELPER = fs.readFileSync("./src/primitives/craftHelper.js", "utf-8");
const CRAFT_ITEM = fs.readFileSync("./src/primitives/craftItem.js", "utf-8");
const EXPLORE_UNTIL = fs.readFileSync("./src/primitives/exploreUntil.js", "utf-8");
const KILL_MOB = fs.readFileSync("./src/primitives/killMob.js", "utf-8");
const MINE_BLOCK = fs.readFileSync("./src/primitives/mineBlock.js", "utf-8");
const PLACE_ITEM = fs.readFileSync("./src/primitives/placeItem.js", "utf-8");
const SHOOT = fs.readFileSync("./src/primitives/shoot.js", "utf-8");
const SMELT_ITEM = fs.readFileSync("./src/primitives/smeltItem.js", "utf-8");
const USE_CHEST = fs.readFileSync("./src/primitives/useChest.js", "utf-8");
const WAIT_FOR_MOB_REMOVED = fs.readFileSync("./src/primitives/waitForMobRemoved.js", "utf-8");


function getFunctionName(code: string) {
  const parsed = babel.parse(code).program.body
  return parsed.reverse()[0].id.name;
}

export default class ExecutionEngine {


}

// keep function for now
export async function runExec(bot: Bot, obs: Observer, code: string) {
  obs.setCode(code)
  // first function is what gets run
  // TODO: handle multiple functions
  const functionName = getFunctionName(code)

  // TODO: cleaner env definition
  const program = `
  const { goals } = require('mineflayer-pathfinder');
  const { GoalPlaceBlock, GoalNear, GoalNearXZ, GoalXZ, GoalGetToBlock, GoalFollow, GoalLookAtBlock } = goals;
  const { Vec3 } = require('vec3');

  ${CRAFT_HELPER}
  ${CRAFT_ITEM}
  ${EXPLORE_UNTIL}
  ${KILL_MOB}
  ${MINE_BLOCK}
  ${PLACE_ITEM}
  ${SHOOT}
  ${SMELT_ITEM}
  ${USE_CHEST}
  ${WAIT_FOR_MOB_REMOVED}

  let _mineBlockFailCount = 0;
  let _placeItemFailCount = 0;
  let _craftItemFailCount = 0;
  let _killMobFailCount = 0;
  let _smeltItemFailCount = 0;

  ${code}

  ${functionName}(bot, obs);
  `;

  try {
    bot.chat('Running code');
    await eval(program)
    bot.chat('Done.')
  } catch(e) {
    obs.setError(e)
    return e
  }
}