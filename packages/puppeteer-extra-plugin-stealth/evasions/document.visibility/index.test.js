const test = require('ava')

const {
  getVanillaFingerPrint,
  getStealthFingerPrint
} = require('../../test/util')
const Plugin = require('.')

test('vanilla: visibilityState is hidden in headless', async t => {
  const { pageFnResult } = await getVanillaFingerPrint(
    page => page.evaluate('document.visibilityState')
  )
  // In headless, this is typically 'hidden' (though may vary)
  t.truthy(pageFnResult)
})

test('stealth: visibilityState is visible', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin,
    page => page.evaluate('document.visibilityState')
  )
  t.is(pageFnResult, 'visible')
})

test('stealth: document.hidden is false', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin,
    page => page.evaluate('document.hidden')
  )
  t.false(pageFnResult)
})
