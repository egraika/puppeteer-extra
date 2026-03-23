const test = require('ava')

const { vanillaPuppeteer, addExtra } = require('../../test/util')
const Plugin = require('.')

test('stealth: speechSynthesis.getVoices returns non-empty array', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => {
    if (typeof speechSynthesis === 'undefined') return null
    const voices = speechSynthesis.getVoices()
    return {
      count: voices.length,
      firstName: voices.length > 0 ? voices[0].name : null,
      firstLang: voices.length > 0 ? voices[0].lang : null,
      hasDefault: voices.some(v => v.default)
    }
  })

  if (result) {
    t.true(result.count > 0)
    t.is(result.firstName, 'Google US English')
    t.is(result.firstLang, 'en-US')
    t.true(result.hasDefault)
  } else {
    t.pass()
  }

  await browser.close()
})
