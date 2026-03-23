'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Ensure screen properties are consistent with the viewport in headless mode.
 *
 * In headless Chrome, `screen.width`, `screen.height`, `screen.availWidth`,
 * `screen.availHeight` can be inconsistent with the viewport, and
 * `screen.colorDepth` / `screen.pixelDepth` may differ from headful.
 *
 * @param {Object} [opts] - Options
 * @param {number} [opts.width] - Override screen.width (default: 1920)
 * @param {number} [opts.height] - Override screen.height (default: 1080)
 * @param {number} [opts.colorDepth] - Override screen.colorDepth (default: 24)
 * @param {number} [opts.pixelDepth] - Override screen.pixelDepth (default: 24)
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/screen.properties'
  }

  get defaults() {
    return {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelDepth: 24
    }
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        // Make screen dimensions consistent with window inner dimensions
        // In headful Chrome, screen.availHeight is typically screen.height minus taskbar
        const screenProps = {
          width: {
            get: function () {
              return opts.width
            }
          },
          height: {
            get: function () {
              return opts.height
            }
          },
          availWidth: {
            get: function () {
              return opts.width
            }
          },
          availHeight: {
            get: function () {
              // availHeight is screen height minus taskbar (~40px on Windows)
              return opts.height - 40
            }
          },
          colorDepth: {
            get: function () {
              return opts.colorDepth
            }
          },
          pixelDepth: {
            get: function () {
              return opts.pixelDepth
            }
          }
        }

        for (const [prop, descriptor] of Object.entries(screenProps)) {
          utils.replaceGetterWithProxy(
            Object.getPrototypeOf(screen),
            prop,
            { apply: descriptor.get }
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
