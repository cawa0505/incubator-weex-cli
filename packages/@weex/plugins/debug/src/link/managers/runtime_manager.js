const mlink = require("../index");
const WebsocketTerminal = mlink.Terminal.WebsocketTerminal;
const URL = require("url");
const WebSocket = require("ws");
const os = require("os");
const { hook, request } = require("../../util");
const config = require("../../config");
const { logger } = require("../../util");

class RuntimeManager {
  constructor() {
    this.runtimeTerminalMap = {};
  }
  connect(channelId) {
    return new Promise((resolve, reject) => {
      request
        .getRemote(`http://127.0.0.1:${config.REMOTE_DEBUG_PORT || 9222}/json`)
        .then(data => {
          const list = JSON.parse(data);
          let found = false;
          for (const target of list) {
            const urlObj = URL.parse(target.url);
            if (
              urlObj.pathname === "/runtime.html" &&
              urlObj.port === config.SERVER_PORT + ""
            ) {
              found = target;
              break;
            } else if (urlObj.pathname === "/debug.html") {
              found = target;
            }
          }
          if (found) {
            if (found.webSocketDebuggerUrl) {
              logger.debug(
                `Have found the webSocketDebuggerUrl: ${
                  found.webSocketDebuggerUrl
                }`
              );
              const ws = new WebSocket(found.webSocketDebuggerUrl);
              const terminal = new WebsocketTerminal(ws, channelId);
              const _runtimeTerminalMaps = this.runtimeTerminalMap[channelId];
              if (_runtimeTerminalMaps && _runtimeTerminalMaps.length > 0) {
                _runtimeTerminalMaps.unshift(terminal);
              } else {
                this.runtimeTerminalMap[channelId] = [terminal];
              }
              resolve(terminal);
            } else {
              logger.debug(
                `Not found the webSocketDebuggerUrl from the ${found}`
              );
              reject("TOAST_DO_NOT_OPEN_CHROME_DEVTOOL");
            }
          } else {
            logger.debug(`Not found the remote debug json`);
            reject("TOAST_CAN_NOT_FIND_RUNTIME");
          }
        })
        .catch(e => {
          reject("TOAST_JS_RUNTIME_INIT_FAIL");
        });
    });
  }
  remove(channelId) {
    const terminals = this.runtimeTerminalMap[channelId];
    if (terminals && terminals.length > 0) {
      const popTerminal = terminals.pop();
      popTerminal.websocket.close();
    } else {
      const params = Object.assign(
        {
          stack: "ERROR: Try to remove a non-exist runtime",
          os: os.platform(),
          node: config.nodeVersion,
          npm: config.npmVersion
        },
        config.weexVersion
      );
      hook.record("/weex_tool.weex_debugger.app_crash", params);
      logger.error("Try to remove a non-exist runtime");
    }
  }
  has(channelId) {
    const terminals = this.runtimeTerminalMap[channelId];
    return terminals && terminals.length > 0;
  }
}
module.exports = new RuntimeManager();