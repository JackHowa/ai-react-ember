const util = require('util');
const colors = require('colors'); // eslint-disable-line

const consoleC = {
  debug: (...args) => consoleArgs('blue', ...args),
  info: (...args) => consoleArgs('green', ...args),
  warn: (...args) => consoleArgs('yellow', ...args),
  error: (...args) => consoleArgs('red', ...args),

  // don't set any color for normal consoleC.log()
  log: (...args) => consoleArgs('', ...args)
};
exports.consoleC = consoleC; // eslint-disable-line

const consoleArgs = (color, message, ...args) => {
  if (!color) {
    console.log(message, ...args);
    return;
  }

  console.log(
    message[color],
    ...args.map((m) => {
      if (typeof m === 'string') {
        return m[color];
      }
      return m;
    })
  );
};

const inspectObj = (obj = {}) => util.inspect(obj, false, null, false);
exports.inspectObj = inspectObj; // eslint-disable-line

// eslint-disable-next-line
exports.printObj = (msg, obj = {}) => {
  consoleC.debug(msg, inspectObj(obj));
  consoleC.debug('\n');
};
