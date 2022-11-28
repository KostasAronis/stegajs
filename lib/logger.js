/**
 * Minimal Logger class to be used as a singleton throughout the app
 * debug only prints if initiated with debug=true.
 */
class Logger {
  static logger = null;

  constructor(dbg) {
    this.dbg = dbg;
  }

  error = console.error;
  log = console.log;
  debug = (data, ...args) => {
    if (!this.dbg) {
      return
    }

    console.debug(data, ...args)
  };
}

// This produces a singleton logger to be used throughout the app
module.exports = ((dbg) => {
  if (Logger.logger === null) {
    Logger.logger = new Logger(dbg);
  }

  return Logger.logger;
})