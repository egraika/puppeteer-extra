/**
 * Worker context patching utility.
 *
 * evaluateOnNewDocument only runs in the page context, not in Workers.
 * This utility intercepts Worker/SharedWorker creation and prepends
 * evasion code to Worker scripts via Blob/URL.createObjectURL interception.
 *
 * Limitations:
 * - Only navigator.* property evasions can work in Workers (no DOM APIs)
 * - Service Workers cannot be intercepted this way
 * - Cross-origin Worker scripts cannot be modified
 *
 * @param {string} evasionCode - JavaScript code string to prepend to Worker scripts
 */
module.exports.generateWorkerPatcher = function generateWorkerPatcher(
  evasionCode
) {
  return `
    ;(function patchWorkers() {
      const WORKER_EVASION_CODE = ${JSON.stringify(evasionCode + '\n')};
      const OriginalBlob = Blob;
      const OriginalCreateObjectURL = URL.createObjectURL.bind(URL);

      // Intercept URL.createObjectURL — when it receives a JS-typed Blob,
      // create a new Blob with evasion code prepended
      URL.createObjectURL = function (obj) {
        // Only patch Blobs that look like Worker scripts
        if (obj instanceof Blob && obj.type &&
            (obj.type.includes('javascript') || obj.type.includes('ecmascript'))) {
          try {
            const patchedBlob = new OriginalBlob(
              [WORKER_EVASION_CODE, obj],
              { type: obj.type }
            );
            return OriginalCreateObjectURL(patchedBlob);
          } catch (e) {
            // Fall through to original on error
          }
        }
        return OriginalCreateObjectURL(obj);
      };

      // Also intercept Worker constructor for data: URLs
      if (typeof Worker !== 'undefined') {
        const OriginalWorker = Worker;
        window.Worker = new Proxy(OriginalWorker, {
          construct(target, args) {
            const [scriptURL, options] = args;
            if (typeof scriptURL === 'string' && scriptURL.startsWith('data:')) {
              try {
                const commaIdx = scriptURL.indexOf(',');
                if (commaIdx !== -1) {
                  const header = scriptURL.substring(0, commaIdx);
                  const body = scriptURL.substring(commaIdx + 1);
                  const decoded = decodeURIComponent(body);
                  const patched = WORKER_EVASION_CODE + decoded;
                  const newURL = header + ',' + encodeURIComponent(patched);
                  return new target(newURL, options);
                }
              } catch (e) {
                // Fall through to original on error
              }
            }
            return new target(scriptURL, options);
          }
        });
      }
    })();
  `
}

/**
 * Generate navigator evasion code suitable for Worker contexts.
 * Workers don't have DOM access, so only navigator.* properties apply.
 *
 * @param {Object} opts - Options
 * @param {number} [opts.hardwareConcurrency] - Value (default: 4)
 * @param {number} [opts.deviceMemory] - Value (default: 8)
 */
module.exports.generateWorkerEvasionCode = function generateWorkerEvasionCode(
  opts = {}
) {
  const hardwareConcurrency = opts.hardwareConcurrency || 4
  const deviceMemory = opts.deviceMemory || 8

  return `
    ;(function workerEvasions() {
      try {
        Object.defineProperty(Object.getPrototypeOf(navigator), 'hardwareConcurrency', {
          get: function() { return ${hardwareConcurrency}; }
        });
      } catch(e) {}
      try {
        Object.defineProperty(Object.getPrototypeOf(navigator), 'deviceMemory', {
          get: function() { return ${deviceMemory}; }
        });
      } catch(e) {}
    })();
  `
}
