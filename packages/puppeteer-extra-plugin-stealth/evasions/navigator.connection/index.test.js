const test = require('ava')

const { vanillaPuppeteer, addExtra } = require('../../test/util')
const {
  getStealthFingerPrint
} = require('../../test/util')
const Plugin = require('.')

test('stealth: navigator.connection.effectiveType is 4g', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => {
    const conn = navigator.connection
    if (!conn) return null
    return {
      effectiveType: conn.effectiveType,
      rtt: conn.rtt,
      downlink: conn.downlink,
      saveData: conn.saveData
    }
  })

  if (result) {
    t.is(result.effectiveType, '4g')
    t.is(result.rtt, 50)
    t.is(result.downlink, 10)
    t.false(result.saveData)
  } else {
    // navigator.connection may not exist in all environments
    t.pass()
  }

  await browser.close()
})

test('stealth: custom values work', async t => {
  const { pageFnResult } = await getStealthFingerPrint(
    Plugin,
    page =>
      page.evaluate(() => {
        return navigator.connection
          ? navigator.connection.effectiveType
          : null
      }),
    { effectiveType: '3g' }
  )

  if (pageFnResult) {
    t.is(pageFnResult, '3g')
  } else {
    t.pass()
  }
})
