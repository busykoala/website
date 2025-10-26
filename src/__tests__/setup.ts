// Vitest setup for jsdom environment
// - Ensure deterministic timezone and any small polyfills used in tests

// Force a stable timezone for date-related tests without relying on Node types
const g: any = globalThis as any;
g.process = g.process || { env: {} };
g.process.env = g.process.env || {};
g.process.env.TZ = 'UTC';

// Provide a minimal matchMedia to avoid errors when components query it
if (typeof (globalThis as any).window !== 'undefined') {
  const w: any = (globalThis as any).window;
  if (!w.matchMedia) {
    w.matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
      media: '',
    });
  }
}
