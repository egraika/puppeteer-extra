'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Mock `speechSynthesis.getVoices()` which returns empty in headless Chrome.
 *
 * Detection services check the voices list as headless Chrome has no
 * speech synthesis backend, resulting in an empty array.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/speech.synthesis'
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(utils => {
      if (typeof speechSynthesis === 'undefined') return

      // Mock voices that match a typical Chrome on Windows/macOS
      const mockVoices = [
        { name: 'Google US English', lang: 'en-US', localService: false, default: true },
        { name: 'Google UK English Female', lang: 'en-GB', localService: false, default: false },
        { name: 'Google UK English Male', lang: 'en-GB', localService: false, default: false },
        { name: 'Google español', lang: 'es-ES', localService: false, default: false },
        { name: 'Google français', lang: 'fr-FR', localService: false, default: false },
        { name: 'Google Deutsch', lang: 'de-DE', localService: false, default: false },
        { name: 'Google italiano', lang: 'it-IT', localService: false, default: false },
        { name: 'Google 日本語', lang: 'ja-JP', localService: false, default: false },
        { name: 'Google 한국의', lang: 'ko-KR', localService: false, default: false },
        { name: 'Google 中文（普通话）', lang: 'zh-CN', localService: false, default: false }
      ].map(function (v) {
        // Create objects that look like SpeechSynthesisVoice
        const voice = Object.create(
          typeof SpeechSynthesisVoice !== 'undefined'
            ? SpeechSynthesisVoice.prototype
            : Object.prototype
        )
        Object.defineProperties(voice, {
          name: { value: v.name, enumerable: true },
          lang: { value: v.lang, enumerable: true },
          localService: { value: v.localService, enumerable: true },
          default: { value: v.default, enumerable: true },
          voiceURI: { value: v.name, enumerable: true }
        })
        return voice
      })

      utils.replaceWithProxy(speechSynthesis, 'getVoices', {
        apply() {
          return mockVoices
        }
      })
    })
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
