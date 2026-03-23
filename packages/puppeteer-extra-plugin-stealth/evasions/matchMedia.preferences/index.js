'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Normalize CSS media query results to match headful Chrome defaults.
 *
 * In headless Chrome, `matchMedia()` may return different values for
 * `prefers-color-scheme`, `prefers-reduced-motion`, and other media features.
 * Detection services use these to distinguish headless from headful browsers.
 *
 * @param {Object} [opts] - Options
 * @param {string} [opts.prefersColorScheme] - 'light' or 'dark' (default: 'light')
 * @param {string} [opts.prefersReducedMotion] - 'no-preference' or 'reduce' (default: 'no-preference')
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/matchMedia.preferences'
  }

  get defaults() {
    return {
      prefersColorScheme: 'light',
      prefersReducedMotion: 'no-preference'
    }
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        const overrides = {
          '(prefers-color-scheme: dark)': opts.prefersColorScheme === 'dark',
          '(prefers-color-scheme: light)': opts.prefersColorScheme === 'light',
          '(prefers-reduced-motion: reduce)': opts.prefersReducedMotion === 'reduce',
          '(prefers-reduced-motion: no-preference)': opts.prefersReducedMotion === 'no-preference'
        }

        const originalMatchMedia = window.matchMedia
        utils.replaceWithProxy(window, 'matchMedia', {
          apply(target, ctx, args) {
            const query = args[0]
            // Check if this is a query we want to override
            if (query in overrides) {
              const result = utils.cache.Reflect.apply(target, ctx, args)
              // Return a proxy that overrides the matches property
              return new Proxy(result, {
                get(target, prop) {
                  if (prop === 'matches') {
                    return overrides[query]
                  }
                  const value = Reflect.get(target, prop)
                  if (typeof value === 'function') {
                    return value.bind(target)
                  }
                  return value
                }
              })
            }
            return utils.cache.Reflect.apply(target, ctx, args)
          }
        })
      },
      { opts: this.opts }
    )
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
