declare module 'vite-plugin-eslint' {
  import type { Plugin } from 'vite';
  const plugin: (options?: Record<string, any>) => Plugin;
  export default plugin;
}
