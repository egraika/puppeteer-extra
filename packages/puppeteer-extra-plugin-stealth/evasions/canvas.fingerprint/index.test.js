const test = require('ava')

const { vanillaPuppeteer, addExtra } = require('../../test/util')
const Plugin = require('.')

test('stealth: canvas toDataURL returns different values per session', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result1 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 200, 50)
    ctx.fillStyle = 'blue'
    ctx.font = '20px Arial'
    ctx.fillText('Hello World', 10, 35)
    return canvas.toDataURL()
  })

  // The result should be a valid data URL
  t.true(result1.startsWith('data:image/png;base64,'))

  await browser.close()
})

test('stealth: getImageData returns modified pixel data', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(0, 0, 10, 10)
    const imageData = ctx.getImageData(0, 0, 10, 10)
    return Array.from(imageData.data.slice(0, 4))
  })

  // Should have pixel data (roughly red - may have noise)
  t.true(result[0] >= 250) // Red channel ~255
  t.true(result[3] === 255) // Alpha should be untouched

  await browser.close()
})
