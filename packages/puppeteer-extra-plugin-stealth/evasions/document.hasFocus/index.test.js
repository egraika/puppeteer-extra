const test = require('ava')

const {
  getVanillaFingerPrint,
  getStealthFingerPrint
} = require('../../test/util')
const { vanillaPuppeteer, addExtra } = require('../../test/util')
const Plugin = require('.')

const fingerprintFn = page => page.evaluate('document.hasFocus()')

test('vanilla: returns false in headless', async t => {
  const { pageFnResult } = await getVanillaFingerPrint(fingerprintFn)
  t.false(pageFnResult)
})

test('stealth: returns true in headless', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin, fingerprintFn)
  t.true(pageFnResult)
})

test('stealth: hasFocus toString looks native', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(
    () => document.hasFocus.toString()
  )

  t.is(result, 'function hasFocus() { [native code] }')

  await browser.close()
})
