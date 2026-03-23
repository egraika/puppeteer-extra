'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const withUtils = require('../_utils/withUtils')

/**
 * Fix `Notification.permission` behaving weirdly in headless mode
 *
 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=1052332
 */

class Plugin extends PuppeteerExtraPlugin {
  constructor(opts = {}) {
    super(opts)
  }

  get name() {
    return 'stealth/evasions/navigator.permissions'
  }

  /* global Notification Permissions PermissionStatus */
  async onPageCreated(page) {
    await withUtils(page).evaluateOnNewDocument((utils, opts) => {
      const isSecure = document.location.protocol.startsWith('https')

      // In headful on secure origins the permission should be "default", not "denied"
      if (isSecure && typeof Notification !== 'undefined') {
        utils.replaceGetterWithProxy(Notification, 'permission', {
          apply() {
            return 'default'
          }
        })
      }

      // Default permission states that match a fresh headful Chrome profile.
      // Detection services query many permission types to find inconsistencies.
      // Permission states matching a fresh headful Chrome profile.
      // Most permissions default to 'prompt' on a clean install.
      const permissionDefaults = {
        'geolocation': 'prompt',
        'notifications': isSecure ? 'default' : 'denied',
        'push': 'prompt',
        'midi': 'prompt',
        'camera': 'prompt',
        'microphone': 'prompt',
        'background-fetch': 'prompt',
        'background-sync': 'prompt',
        'persistent-storage': 'prompt',
        'ambient-light-sensor': 'prompt',
        'accelerometer': 'prompt',
        'gyroscope': 'prompt',
        'magnetometer': 'prompt',
        'clipboard-read': 'prompt',
        'clipboard-write': 'prompt',
        'payment-handler': 'prompt',
        'idle-detection': 'prompt',
        'periodic-background-sync': 'prompt',
        'screen-wake-lock': 'prompt',
        'nfc': 'prompt',
        'display-capture': 'prompt',
        'window-management': 'prompt'
      }

      const handler = {
        apply(target, ctx, args) {
          const param = (args || [])[0]
          const name = param && param.name

          // If we have a default for this permission, return it
          if (name && name in permissionDefaults) {
            return Promise.resolve(
              Object.setPrototypeOf(
                {
                  state: permissionDefaults[name],
                  onchange: null
                },
                PermissionStatus.prototype
              )
            )
          }

          // For unknown permissions, fall through to the real implementation
          return utils.cache.Reflect.apply(...arguments)
        }
      }
      // Note: Don't use `Object.getPrototypeOf` here
      utils.replaceWithProxy(Permissions.prototype, 'query', handler)

      // Fix Notification constructor behavior in headless.
      // In headless on insecure origins, `new Notification('test')` may throw
      // differently than in headful. Proxy the constructor to normalize behavior.
      if (typeof Notification !== 'undefined') {
        const OriginalNotification = Notification
        const NotificationProxy = new Proxy(OriginalNotification, {
          construct(target, args) {
            // In headful Chrome on insecure origins, the constructor works
            // but the notification just doesn't show. Replicate that behavior.
            try {
              return new target(...args)
            } catch (e) {
              // If it throws (headless), return a mock notification object
              const notification = Object.create(OriginalNotification.prototype)
              Object.defineProperties(notification, {
                title: { value: args[0] || '', enumerable: true },
                body: { value: (args[1] && args[1].body) || '', enumerable: true },
                icon: { value: (args[1] && args[1].icon) || '', enumerable: true },
                tag: { value: (args[1] && args[1].tag) || '', enumerable: true },
                onclick: { value: null, writable: true, enumerable: true },
                onclose: { value: null, writable: true, enumerable: true },
                onerror: { value: null, writable: true, enumerable: true },
                onshow: { value: null, writable: true, enumerable: true },
                close: { value: function () {}, enumerable: true }
              })
              return notification
            }
          },
          get(target, prop) {
            // Pass through static properties like Notification.permission
            return Reflect.get(target, prop)
          }
        })
        utils.replaceProperty(window, 'Notification', {
          value: NotificationProxy
        })
        utils.patchToString(NotificationProxy, 'function Notification() { [native code] }')
      }
    }, this.opts)
  }
}

module.exports = function (pluginConfig) {
  return new Plugin(pluginConfig)
}
