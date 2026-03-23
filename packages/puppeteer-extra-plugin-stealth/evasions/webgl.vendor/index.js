'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Fix WebGL Vendor/Renderer being set to Google in headless mode.
 *
 * Modern Chrome uses ANGLE for WebGL rendering and reports vendor/renderer
 * strings in a different format than older versions.
 *
 * Default values updated to match modern ANGLE-based rendering on Windows,
 * which is the most common platform.
 *
 * @param {Object} [opts] - Options
 * @param {string} [opts.vendor] - The vendor string to use (default: `Google Inc. (Intel)`)
 * @param {string} [opts.renderer] - The renderer string (default: `ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)`)
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/webgl.vendor'
  }

  /* global WebGLRenderingContext WebGL2RenderingContext */
  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument((utils, opts) => {
      const getParameterProxyHandler = {
        apply: function(target, ctx, args) {
          const param = (args || [])[0]
          const result = utils.cache.Reflect.apply(target, ctx, args)
          // UNMASKED_VENDOR_WEBGL
          if (param === 37445) {
            return opts.vendor || 'Google Inc. (Intel)'
          }
          // UNMASKED_RENDERER_WEBGL
          if (param === 37446) {
            return (
              opts.renderer ||
              'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)'
            )
          }
          return result
        }
      }

      // There's more than one WebGL rendering context
      // https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext#Browser_compatibility
      // To find out the original values here: Object.getOwnPropertyDescriptors(WebGLRenderingContext.prototype.getParameter)
      const addProxy = (obj, propName) => {
        utils.replaceWithProxy(obj, propName, getParameterProxyHandler)
      }
      // For whatever weird reason loops don't play nice with Object.defineProperty, here's the next best thing:
      addProxy(WebGLRenderingContext.prototype, 'getParameter')
      addProxy(WebGL2RenderingContext.prototype, 'getParameter')
    }, this.opts)
  }
}

module.exports = function(pluginConfig) {
  return new Plugin(pluginConfig)
}
