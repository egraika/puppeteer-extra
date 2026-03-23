'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Prevent font enumeration fingerprinting.
 *
 * Font fingerprinting works by rendering text in various fonts and measuring
 * the resulting width/height via canvas measureText() or element offsetWidth.
 * Headless Chrome has fewer installed fonts than headful, creating a distinct signal.
 *
 * This evasion adds subtle deterministic noise to measureText() results.
 * Identical text+font combinations always return the same noised value,
 * matching real browser behavior where measureText is deterministic.
 *
 * @param {Object} [opts] - Options
 * @param {number} [opts.noise] - Maximum noise offset in pixels (default: 0.1)
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/font.fingerprint'
  }

  get defaults() {
    return {
      noise: 0.1
    }
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        // Session seed ensures noise differs across sessions
        const sessionSeed = Math.floor(Math.random() * 0xffffffff)

        // Simple string hash for deterministic per-input noise
        const hashString = function (str) {
          let hash = sessionSeed
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash + char) | 0
          }
          return hash
        }

        // Deterministic noise from a hash — always same output for same input
        const deterministicNoise = function (hash, propIndex) {
          let h = ((hash + propIndex * 7919) | 0) ^ 0x5f3759df
          h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
          h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
          h = (h ^ (h >>> 16)) >>> 0
          return ((h / 0xffffffff) - 0.5) * 2 * opts.noise
        }

        utils.replaceWithProxy(
          CanvasRenderingContext2D.prototype,
          'measureText',
          {
            apply(target, ctx, args) {
              const metrics = utils.cache.Reflect.apply(target, ctx, args)
              const text = args[0] || ''
              const font = ctx.font || ''
              const cacheKey = font + '|' + text
              const hash = hashString(cacheKey)

              // Property index map for deterministic per-property noise
              const propIndices = {
                width: 0,
                actualBoundingBoxLeft: 1,
                actualBoundingBoxRight: 2,
                fontBoundingBoxAscent: 3,
                fontBoundingBoxDescent: 4,
                actualBoundingBoxAscent: 5,
                actualBoundingBoxDescent: 6,
                emHeightAscent: 7,
                emHeightDescent: 8,
                hangingBaseline: 9,
                alphabeticBaseline: 10,
                ideographicBaseline: 11
              }

              const handler = {
                get(target, prop) {
                  const value = utils.cache.Reflect.get(target, prop)
                  if (typeof value === 'number' && prop in propIndices) {
                    return value + deterministicNoise(hash, propIndices[prop])
                  }
                  return value
                }
              }
              return new Proxy(metrics, handler)
            }
          }
        )
      },
      { opts: this.opts }
    )
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
