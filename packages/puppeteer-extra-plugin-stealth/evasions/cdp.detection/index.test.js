const test = require('ava')

const { vanillaPuppeteer, addExtra } = require('../../test/util')
const Plugin = require('.')

test('stealth: no cdc_ properties on window', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => {
    const cdcProps = Object.keys(window).filter(k => k.match(/^cdc_/))
    const docCdcProps = Object.keys(document).filter(
      k => k.match(/^\$cdc_/) || k === '$chrome_asyncScriptInfo'
    )
    return {
      windowCdc: cdcProps,
      documentCdc: docCdcProps
    }
  })

  t.deepEqual(result.windowCdc, [])
  t.deepEqual(result.documentCdc, [])

  await browser.close()
})

test('stealth: automation globals are cleaned', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => ({
    hasNightmare: '__nightmare' in window,
    hasPhantom: '_phantom' in window,
    hasSelenium: '_selenium' in window,
    hasDomAutomation: 'domAutomation' in window,
    hasDomAutomationController: 'domAutomationController' in window
  }))

  t.false(result.hasNightmare)
  t.false(result.hasPhantom)
  t.false(result.hasSelenium)
  t.false(result.hasDomAutomation)
  t.false(result.hasDomAutomationController)

  await browser.close()
})
