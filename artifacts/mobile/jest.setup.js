const nativeStructuredClone = globalThis.structuredClone;
if (nativeStructuredClone) {
  Object.defineProperty(global, "structuredClone", {
    value: nativeStructuredClone,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (!global.__ExpoImportMetaRegistry) {
  global.__ExpoImportMetaRegistry = {
    register: jest.fn(),
    resolve: jest.fn(),
  };
}
