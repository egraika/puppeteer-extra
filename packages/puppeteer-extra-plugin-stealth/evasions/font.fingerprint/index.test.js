const test = require('ava')

const { vanillaPuppeteer, addExtra } = require('../../test/util')
const Plugin = require('.')

test('stealth: measureText returns modified metrics', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.font = '16px Arial'
    const metrics = ctx.measureText('Hello World')
    return {
      width: metrics.width,
      hasWidth: metrics.width > 0,
      isNumber: typeof metrics.width === 'number'
    }
  })

  t.true(result.hasWidth)
  t.true(result.isNumber)

  await browser.close()
})
