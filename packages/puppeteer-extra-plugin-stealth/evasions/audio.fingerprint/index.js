'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Prevent AudioContext fingerprinting by adding subtle noise to audio output data.
 *
 * Audio fingerprinting works by creating an OfflineAudioContext, generating a tone
 * with an OscillatorNode, and reading back the rendered audio buffer. The audio
 * processing pipeline differs between headless and headful Chrome.
 *
 * This evasion injects tiny noise into AudioBuffer.getChannelData() results.
 *
 * @param {Object} [opts] - Options
 * @param {number} [opts.noise] - Noise intensity multiplier (default: 0.0001)
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/audio.fingerprint'
  }

  get defaults() {
    return {
      noise: 0.0001
    }
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        // Seeded PRNG for consistent noise within a session
        const seed = Math.floor(Math.random() * 0xffffffff)
        function mulberry32(a) {
          return function () {
            a |= 0
            a = (a + 0x6d2b79f5) | 0
            let t = Math.imul(a ^ (a >>> 15), 1 | a)
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
          }
        }
        const rng = mulberry32(seed)

        // Proxy AudioBuffer.getChannelData to inject noise
        const originalGetChannelData =
          AudioBuffer.prototype.getChannelData
        utils.replaceWithProxy(AudioBuffer.prototype, 'getChannelData', {
          apply(target, ctx, args) {
            const data = utils.cache.Reflect.apply(target, ctx, args)
            // Only add noise once per buffer (tag it)
            if (!ctx._noised) {
              for (let i = 0; i < data.length; i += 100) {
                // Sparse noise to minimize performance impact
                const noise = (rng() - 0.5) * 2 * opts.noise
                data[i] = data[i] + noise
              }
              ctx._noised = true
            }
            return data
          }
        })

        // Proxy AnalyserNode.getFloatFrequencyData to inject noise
        if (typeof AnalyserNode !== 'undefined') {
          const originalGetFloatFrequencyData =
            AnalyserNode.prototype.getFloatFrequencyData
          utils.replaceWithProxy(
            AnalyserNode.prototype,
            'getFloatFrequencyData',
            {
              apply(target, ctx, args) {
                const result = utils.cache.Reflect.apply(target, ctx, args)
                const array = args[0]
                if (array && array.length) {
                  for (let i = 0; i < array.length; i += 100) {
                    array[i] = array[i] + (rng() - 0.5) * 0.1
                  }
                }
                return result
              }
            }
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
