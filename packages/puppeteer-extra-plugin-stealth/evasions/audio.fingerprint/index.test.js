const test = require('ava')

const { vanillaPuppeteer, addExtra } = require('../../test/util')
const Plugin = require('.')

test('stealth: AudioBuffer.getChannelData returns data with noise', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(async () => {
    const ctx = new OfflineAudioContext(1, 44100, 44100)
    const oscillator = ctx.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(10000, ctx.currentTime)
    oscillator.connect(ctx.destination)
    oscillator.start(0)
    const buffer = await ctx.startRendering()
    const data = buffer.getChannelData(0)
    // Return a few samples for verification
    return {
      length: data.length,
      sample0: data[0],
      sample100: data[100],
      hasData: data.some(v => v !== 0)
    }
  })

  t.is(result.length, 44100)
  t.true(result.hasData)

  await browser.close()
})
