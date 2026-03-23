const test = require('ava')

const { vanillaPuppeteer, addExtra } = require('../../test/util')
const Plugin = require('.')

test('stealth: screen.colorDepth is 24', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => ({
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth
  }))

  t.is(result.colorDepth, 24)
  t.is(result.pixelDepth, 24)

  await browser.close()
})

test('stealth: screen.availWidth matches innerWidth', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => ({
    availWidth: screen.availWidth,
    innerWidth: window.innerWidth,
    availHeight: screen.availHeight,
    innerHeight: window.innerHeight
  }))

  t.is(result.availWidth, result.innerWidth)
  t.is(result.availHeight, result.innerHeight)

  await browser.close()
})
