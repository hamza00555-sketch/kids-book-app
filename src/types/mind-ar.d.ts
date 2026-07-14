// The MindAR prod bundles ship no TypeScript types; we bridge them ourselves.
declare module "mind-ar/dist/mindar-image.prod.js" {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export const Controller: any;
  export const Compiler: any;
  export const UI: any;
}
