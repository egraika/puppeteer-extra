'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Prevent canvas fingerprinting by adding subtle noise to canvas readback data.
 *
 * Canvas fingerprinting works by drawing shapes/text to a canvas and reading back
 * the pixel data (via toDataURL, toBlob, or getImageData). The rendering is
 * device/driver-specific, producing a unique fingerprint. Headless Chrome renders
 * differently than headful, making it a strong detection signal.
 *
 * This evasion injects tiny per-session noise into the READBACK data only —
 * the actual canvas pixels are never modified, so rendering, CAPTCHAs, and
 * canvas-dependent applications continue to work correctly.
 *
 * @param {Object} [opts] - Options
 * @param {number} [opts.noise] - Noise intensity from 0-10 (default: 2). Higher = more noise.
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/canvas.fingerprint'
  }

  get defaults() {
    return {
      noise: 2
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

        // Modify pixel data with subtle noise (does NOT mutate the original)
        const noisifyData = function (data, intensity) {
          for (let i = 0; i < data.length; i += 4) {
            if (rng() < 0.1) {
              for (let j = 0; j < 3; j++) {
                const noise = Math.floor(rng() * (intensity * 2 + 1)) - intensity
                data[i + j] = Math.max(0, Math.min(255, data[i + j] + noise))
              }
            }
          }
        }

        // Save native references BEFORE installing proxies so clone handlers
        // can call the originals without hitting our proxy (avoids double-noise)
        const nativeGetImageData = CanvasRenderingContext2D.prototype.getImageData
        const nativeToDataURL = HTMLCanvasElement.prototype.toDataURL
        const nativeToBlob = HTMLCanvasElement.prototype.toBlob

        // Proxy getImageData — noise is applied to the returned copy, not the canvas
        utils.replaceWithProxy(
          CanvasRenderingContext2D.prototype,
          'getImageData',
          {
            apply(target, ctx, args) {
              const imageData = utils.cache.Reflect.apply(target, ctx, args)
              noisifyData(imageData.data, opts.noise)
              return imageData
            }
          }
        )

        // Proxy toDataURL — create an offscreen clone, noise it, export from clone
        // This avoids mutating the original canvas pixels
        utils.replaceWithProxy(HTMLCanvasElement.prototype, 'toDataURL', {
          apply(target, ctx, args) {
            try {
              const clone = document.createElement('canvas')
              clone.width = ctx.width
              clone.height = ctx.height
              const cloneCtx = clone.getContext('2d')
              cloneCtx.drawImage(ctx, 0, 0)
              // Use the saved native getImageData to avoid our proxy (no double-noise)
              const imageData = nativeGetImageData.call(
                cloneCtx, 0, 0, clone.width, clone.height
              )
              noisifyData(imageData.data, opts.noise)
              cloneCtx.putImageData(imageData, 0, 0)
              return nativeToDataURL.apply(clone, args)
            } catch (e) {
              // Fallback to original if anything fails (e.g. tainted canvas)
              return utils.cache.Reflect.apply(target, ctx, args)
            }
          }
        })

        // Proxy toBlob — same offscreen clone approach
        utils.replaceWithProxy(HTMLCanvasElement.prototype, 'toBlob', {
          apply(target, ctx, args) {
            try {
              const clone = document.createElement('canvas')
              clone.width = ctx.width
              clone.height = ctx.height
              const cloneCtx = clone.getContext('2d')
              cloneCtx.drawImage(ctx, 0, 0)
              const imageData = nativeGetImageData.call(
                cloneCtx, 0, 0, clone.width, clone.height
              )
              noisifyData(imageData.data, opts.noise)
              cloneCtx.putImageData(imageData, 0, 0)
              return nativeToBlob.apply(clone, args)
            } catch (e) {
              return utils.cache.Reflect.apply(target, ctx, args)
            }
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
