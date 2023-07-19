import { Bot } from "mineflayer";

export default class Observer {

  bot: Bot;
  code: string;
  error: Error;

  logs: string[] = [];

  constructor(bot) {
    this.bot = bot;
  }

  setCode(code: string) {
    this.code = code;
    console.warn('===CODE===')
    console.warn(code)
    console.warn('==========')
  }

  setError(e: Error) {
    this.bot.chat(`I failed to run your code ${e.message}`)
    this.error = e
  }

  message(message) {
    console.warn(message)
    this.logs.push(message)
  }
}
