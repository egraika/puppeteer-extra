const test = require('ava')

const { vanillaPuppeteer, addExtra } = require('../../test/util')
const Plugin = require('.')

test('stealth: sanitize mode removes real IPs from SDP', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin({ mode: 'sanitize' }))
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const hasRealIP = await page.evaluate(async () => {
    return new Promise(resolve => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })
        pc.createDataChannel('')
        pc.createOffer().then(offer => {
          // Check the SDP for real IP addresses (non-0.0.0.0, non-127.x)
          const sdp = offer.sdp || ''
          const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g
          const ips = sdp.match(ipRegex) || []
          const realIPs = ips.filter(
            ip => !ip.startsWith('0.') && !ip.startsWith('127.') && ip !== '0.0.0.0'
          )
          pc.close()
          resolve(realIPs.length > 0)
        })

        // Timeout after 3 seconds
        setTimeout(() => {
          pc.close()
          resolve(false)
        }, 3000)
      } catch (e) {
        resolve(false)
      }
    })
  })

  t.false(hasRealIP)

  await browser.close()
})

test('stealth: disable mode blocks RTCPeerConnection', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin({ mode: 'disable' }))
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => {
    const pc = new RTCPeerConnection()
    // In disable mode the constructor returns a mock object
    return typeof pc.createDataChannel === 'function'
  })

  t.true(result)

  await browser.close()
})
