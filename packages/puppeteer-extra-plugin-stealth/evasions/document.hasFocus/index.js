'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Fix `document.hasFocus()` always returning false in headless mode.
 *
 * In headless Chrome there is no active window, so `document.hasFocus()` returns false.
 * This is a trivial detection check used by many bot detection services.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/hasFocus
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/document.hasFocus'
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(utils => {
      utils.replaceWithProxy(Document.prototype, 'hasFocus', {
        apply(target, ctx, args) {
          return true
        }
      })
    })
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
