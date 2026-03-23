'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')
const withUtils = require('../_utils/withUtils')

/**
 * Pass the Languages Test. Allows setting custom languages.
 *
 * @param {Object} [opts] - Options
 * @param {Array<string>} [opts.languages] - The languages to use (default: `['en-US', 'en']`)
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/navigator.languages'
  }

  get defaults() {
    return {
      languages: [] // Empty default, otherwise this would be merged with user defined array override
    }
  }

  get requirements() {
    return new Set(['dataFromPlugins'])
  }

  async onPageCreated(page) {
    // Try to sync with the locale set by user-agent-override via plugin data
    let resolvedLanguages = this.opts.languages
    if (!resolvedLanguages || !resolvedLanguages.length) {
      // Check if user-agent-override has set a locale via data sharing
      const uaData = this.getDataFromPlugins('userPreferences')
        .map(d => d.value)
      const uaLocale =
        uaData.length > 0 && uaData[0].intl
          ? uaData[0].intl.accept_languages
          : null
      if (uaLocale) {
        // Convert 'de-DE,de' format to ['de-DE', 'de'] array
        resolvedLanguages = uaLocale.split(',').map(l => l.trim())
      }
    }

    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        const languages = opts.languages.length
          ? opts.languages
          : ['en-US', 'en']
        utils.replaceGetterWithProxy(
          Object.getPrototypeOf(navigator),
          'languages',
          utils.makeHandler().getterValue(Object.freeze([...languages]))
        )
        // Also set navigator.language (singular) to match languages[0]
        // Detection services check navigator.language === navigator.languages[0]
        utils.replaceGetterWithProxy(
          Object.getPrototypeOf(navigator),
          'language',
          utils.makeHandler().getterValue(languages[0])
        )
      },
      {
        opts: {
          languages: resolvedLanguages || this.opts.languages
        }
      }
    )
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
