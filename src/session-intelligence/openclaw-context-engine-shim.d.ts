/**
 * Type-resolution shim for OpenClaw context-engine SDK import path.
 *
 * The runtime package ships declarations under dist/, while plugin code imports
 * from "openclaw/plugin-sdk/context-engine".
 */

declare module 'openclaw/plugin-sdk/context-engine' {
  export * from 'openclaw/dist/plugin-sdk/context-engine/index.js';
}
