// Preload for starter.test.ts: pretends the Node.js version given in FAKE_NODE_VERSION.
"use strict";
Object.defineProperty(process, "versions", { value: { ...process.versions, node: process.env.FAKE_NODE_VERSION } });
