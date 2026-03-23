'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Fix `document.visibilityState` and `document.hidden` in headless mode.
 *
 * In headless Chrome, `document.visibilityState` returns 'hidden' and
 * `document.hidden` returns true. This is a trivial detection check.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/document.visibility'
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(utils => {
      utils.replaceGetterWithProxy(
        Document.prototype,
        'visibilityState',
        utils.makeHandler().getterValue('visible')
      )
      utils.replaceGetterWithProxy(
        Document.prototype,
        'hidden',
        utils.makeHandler().getterValue(false)
      )
    })
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
