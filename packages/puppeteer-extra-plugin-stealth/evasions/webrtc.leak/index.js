'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Prevent WebRTC IP address leaks.
 *
 * RTCPeerConnection can expose local and public IP addresses, defeating proxies.
 * This is a major detection signal used by bot detection services.
 *
 * @param {Object} [opts] - Options
 * @param {string} [opts.mode] - 'disable' to fully block WebRTC, 'sanitize' to replace IPs with mDNS (default: 'sanitize')
 */
class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/webrtc.leak'
  }

  get defaults() {
    return {
      mode: 'sanitize' // 'disable' | 'sanitize'
    }
  }

  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument(
      (utils, { opts }) => {
        if (opts.mode === 'disable') {
          // Completely replace RTCPeerConnection with a no-op
          if (typeof window.RTCPeerConnection !== 'undefined') {
            const fakeRTC = function () {
              return {
                createDataChannel: function () { return {} },
                createOffer: function () { return Promise.resolve({}) },
                setLocalDescription: function () { return Promise.resolve() },
                close: function () {},
                onicecandidate: null,
                localDescription: null
              }
            }
            fakeRTC.prototype = RTCPeerConnection.prototype
            utils.replaceProperty(window, 'RTCPeerConnection', {
              value: fakeRTC
            })
            utils.replaceProperty(window, 'webkitRTCPeerConnection', {
              value: fakeRTC
            })
          }
          return
        }

        // Sanitize mode: intercept ICE candidates to remove real IPs
        if (typeof window.RTCPeerConnection !== 'undefined') {
          const ipRegex =
            /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g

          // Replace real IPs in SDP with mDNS-style addresses
          const sanitizeSDP = function (sdp) {
            if (!sdp) return sdp
            return sdp.replace(ipRegex, function (match) {
              // Keep private/link-local ranges as mDNS placeholder
              if (
                match.startsWith('0.') ||
                match.startsWith('127.') ||
                match === '0.0.0.0'
              ) {
                return match
              }
              return '0.0.0.0'
            })
          }

          // Proxy createOffer to sanitize SDP
          const origCreateOffer =
            RTCPeerConnection.prototype.createOffer
          utils.replaceWithProxy(RTCPeerConnection.prototype, 'createOffer', {
            apply(target, ctx, args) {
              return utils.cache.Reflect.apply(target, ctx, args).then(
                function (offer) {
                  if (offer && offer.sdp) {
                    offer.sdp = sanitizeSDP(offer.sdp)
                  }
                  return offer
                }
              )
            }
          })

          // Proxy createAnswer to sanitize SDP
          const origCreateAnswer =
            RTCPeerConnection.prototype.createAnswer
          utils.replaceWithProxy(
            RTCPeerConnection.prototype,
            'createAnswer',
            {
              apply(target, ctx, args) {
                return utils.cache.Reflect.apply(target, ctx, args).then(
                  function (answer) {
                    if (answer && answer.sdp) {
                      answer.sdp = sanitizeSDP(answer.sdp)
                    }
                    return answer
                  }
                )
              }
            }
          )

          // Intercept onicecandidate to sanitize candidates
          const origSetLocalDesc =
            RTCPeerConnection.prototype.setLocalDescription
          utils.replaceWithProxy(
            RTCPeerConnection.prototype,
            'setLocalDescription',
            {
              apply(target, ctx, args) {
                if (args[0] && args[0].sdp) {
                  args[0].sdp = sanitizeSDP(args[0].sdp)
                }
                return utils.cache.Reflect.apply(target, ctx, args)
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
