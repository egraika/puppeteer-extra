const test = require('ava')

const { vanillaPuppeteer, addExtra } = require('../../test/util')
const Plugin = require('.')

test('stealth: prefers-color-scheme: light matches', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => ({
    light: window.matchMedia('(prefers-color-scheme: light)').matches,
    dark: window.matchMedia('(prefers-color-scheme: dark)').matches
  }))

  t.true(result.light)
  t.false(result.dark)

  await browser.close()
})

test('stealth: prefers-reduced-motion: no-preference matches', async t => {
  const puppeteer = addExtra(vanillaPuppeteer).use(Plugin())
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const result = await page.evaluate(() => ({
    noPreference: window.matchMedia('(prefers-reduced-motion: no-preference)').matches,
    reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }))

  t.true(result.noPreference)
  t.false(result.reduce)

  await browser.close()
})
