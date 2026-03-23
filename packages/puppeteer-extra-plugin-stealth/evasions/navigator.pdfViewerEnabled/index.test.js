const test = require('ava')

const { getStealthFingerPrint } = require('../../test/util')
const Plugin = require('.')

test('stealth: navigator.pdfViewerEnabled is true', async t => {
  const { pageFnResult } = await getStealthFingerPrint(Plugin,
    page => page.evaluate('navigator.pdfViewerEnabled')
  )
  t.true(pageFnResult)
})
