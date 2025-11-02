// Ambient module shim so code can continue importing 'positron'
// while using the scoped package '@posit-dev/positron' for the actual types.
// This proxies the 'positron' module name to the exported types of
// '@posit-dev/positron'. Keeps existing imports like `import * as positron from 'positron'` working.
declare module 'positron' {
    export * from '@posit-dev/positron';
}
