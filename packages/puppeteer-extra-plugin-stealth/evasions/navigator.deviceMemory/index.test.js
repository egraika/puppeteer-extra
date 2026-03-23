const test = require('ava')

const {
  getVanillaFingerPrint,
  getStealthFingerPrint
} = require('../../test/util')
const Plugin = require('.')

const fingerprintFn = page => page.evaluate('navigator.deviceMemory')

test('stealth: default is set to 8', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin, fingerprintFn)
  t.is(pageFnResult, 8)
})

test('stealth: will override value correctly', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin, fingerprintFn, {
    deviceMemory: 4
  })
  t.is(pageFnResult, 4)
})
