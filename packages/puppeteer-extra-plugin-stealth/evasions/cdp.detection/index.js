'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Clean up Chrome DevTools Protocol (CDP) artifacts that reveal automation.
 *
 * Several CDP-related artifacts can be detected:
 * - `window.cdc_*` properties left by ChromeDriver
 * - `$cdc_*` variables on document
 * - CDP-related stack frames in Error objects
 * - `document.$chrome_asyncScriptInfo` from Chrome automation
 *
 * This evasion removes known CDP artifacts.
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/cdp.detection'
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument((utils) => {
      // Remove cdc_ properties (ChromeDriver artifacts)
      // These are added by ChromeDriver and are a well-known detection vector
      const removeCdcProps = () => {
        for (const prop of Object.keys(window)) {
          if (prop.match(/^cdc_/)) {
            delete window[prop]
          }
        }
        for (const prop of Object.keys(document)) {
          if (
            prop.match(/^\$cdc_/) ||
            prop === '$chrome_asyncScriptInfo'
          ) {
            delete document[prop]
          }
        }
      }
      // Remove immediately
      removeCdcProps()
      // Repeat at multiple intervals to catch late-injected properties
      // ChromeDriver injects cdc_ props at unpredictable times
      setTimeout(removeCdcProps, 50)
      setTimeout(removeCdcProps, 200)
      setTimeout(removeCdcProps, 1000)

      // Also set up a periodic check for the first 5 seconds
      let checkCount = 0
      const interval = setInterval(function () {
        removeCdcProps()
        checkCount++
        if (checkCount >= 10) {
          clearInterval(interval)
        }
      }, 500)

      // Intercept Error.prepareStackTrace to filter CDP-related frames
      if (typeof Error.prepareStackTrace !== 'undefined') {
        const originalPrepareStackTrace = Error.prepareStackTrace
        Error.prepareStackTrace = function (error, structuredStackTrace) {
          // Filter out frames with CDP-related URLs
          const filtered = structuredStackTrace.filter(function (frame) {
            const fileName = frame.getFileName() || ''
            return (
              !fileName.includes('__puppeteer_evaluation_script__') &&
              !fileName.includes('pptr:') &&
              !fileName.includes('devtools:')
            )
          })
          if (originalPrepareStackTrace) {
            return originalPrepareStackTrace(error, filtered)
          }
          return filtered
        }
      }

      // Remove window.Puppeteer and similar automation-revealing globals
      const automationProps = [
        '__nightmare',
        '_phantom',
        '__phantomas',
        'callPhantom',
        '_selenium',
        '_Selenium_IDE_Recorder',
        'callSelenium',
        '_WEBDRIVER_ELEM_CACHE',
        'ChromeDriverw',
        'driver-hierarchyassistant',
        'webdriver',
        '__webdriverFunc',
        '__lastWatirAlert',
        '__lastWatirConfirm',
        '__lastWatirPrompt',
        '_WEBDRIVER_ELEM_CACHE',
        'domAutomation',
        'domAutomationController'
      ]
      for (const prop of automationProps) {
        if (prop in window) {
          try {
            delete window[prop]
          } catch (e) {
            // Some properties may not be configurable
          }
        }
      }
    })
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
