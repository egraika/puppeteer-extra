const test = require('ava')

const { getStealthFingerPrint } = require('../../test/util')
const Plugin = require('.')

test('stealth: default history.length is 2', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin,
    page => page.evaluate('history.length')
  )
  t.is(pageFnResult, 2)
})

test('stealth: custom history.length', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin,
    page => page.evaluate('history.length'),
    { length: 5 }
  )
  t.is(pageFnResult, 5)
})
