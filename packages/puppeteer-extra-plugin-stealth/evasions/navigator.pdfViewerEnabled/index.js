'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Set `navigator.pdfViewerEnabled` to true.
 *
 * This property was added in Chrome 94+ and should return `true` for
 * browsers with a built-in PDF viewer. Headless Chrome may not set this correctly.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/pdfViewerEnabled
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/navigator.pdfViewerEnabled'
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(utils => {
      utils.replaceGetterWithProxy(
        Object.getPrototypeOf(navigator),
        'pdfViewerEnabled',
        utils.makeHandler().getterValue(true)
      )
    })
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
