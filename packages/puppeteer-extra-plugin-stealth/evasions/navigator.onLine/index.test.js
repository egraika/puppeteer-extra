const test = require('ava')

const { getStealthFingerPrint } = require('../../test/util')
const Plugin = require('.')

test('stealth: navigator.onLine is true', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin,
    page => page.evaluate('navigator.onLine')
  )
  t.true(pageFnResult)
})
