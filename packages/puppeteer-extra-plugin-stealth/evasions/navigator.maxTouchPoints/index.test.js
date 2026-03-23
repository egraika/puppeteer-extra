const test = require('ava')

const { getStealthFingerPrint } = require('../../test/util')
const Plugin = require('.')

const fingerprintFn = page => page.evaluate('navigator.maxTouchPoints')

test('stealth: default is 0 for desktop', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin, fingerprintFn)
  t.is(pageFnResult, 0)
})

test('stealth: can override for mobile', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin, fingerprintFn, {
    maxTouchPoints: 5
  })
  t.is(pageFnResult, 5)
})
