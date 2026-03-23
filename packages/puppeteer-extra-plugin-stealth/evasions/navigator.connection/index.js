'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Mock the Network Information API (`navigator.connection`).
 *
 * In headless Chrome, `navigator.connection` may be missing or return
 * unrealistic values. Detection services check properties like
 * `effectiveType`, `rtt`, `downlink`, and `saveData`.
 *
 * @param {Object} [opts] - Options
 * @param {string} [opts.effectiveType] - The connection type (default: '4g')
 * @param {number} [opts.rtt] - Round trip time in ms (default: 50)
 * @param {number} [opts.downlink] - Downlink speed in Mbps (default: 10)
 * @param {boolean} [opts.saveData] - Data saver mode (default: false)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/navigator.connection'
  }

  get defaults() {
    return {
      effectiveType: '4g',
      rtt: 50,
      downlink: 10,
      saveData: false
    }
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        // If navigator.connection already exists and has correct data, proxy its getters
        // If it doesn't exist, create a mock NetworkInformation object
        if (navigator.connection) {
          // Proxy existing connection object getters
          const props = {
            effectiveType: opts.effectiveType,
            rtt: opts.rtt,
            downlink: opts.downlink,
            saveData: opts.saveData
          }
          for (const [prop, value] of Object.entries(props)) {
            if (prop in navigator.connection) {
              try {
                utils.replaceGetterWithProxy(
                  Object.getPrototypeOf(navigator.connection),
                  prop,
                  utils.makeHandler().getterValue(value)
                )
              } catch (e) {
                // Some properties may not have getters on all platforms
              }
            }
          }
        } else {
          // Create a mock NetworkInformation object
          const connectionData = {
            effectiveType: opts.effectiveType,
            rtt: opts.rtt,
            downlink: opts.downlink,
            saveData: opts.saveData,
            onchange: null,
            addEventListener: function () {},
            removeEventListener: function () {},
            dispatchEvent: function () {
              return true
            }
          }

          utils.replaceGetterWithProxy(
            Object.getPrototypeOf(navigator),
            'connection',
            utils.makeHandler().getterValue(connectionData)
          )
        }
      },
      { opts: this.opts }
    )
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
