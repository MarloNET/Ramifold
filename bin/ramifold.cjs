#!/usr/bin/env node
// Starter of Ramifold (TechSpec 2.1, start step 1). Syntax that every Node.js runs: no import, no arrow functions.
// TERM-006 is the only terminal line outside TerminalOutput; wording from the UI/UX Design.
"use strict";

var path = require("path");
var url = require("url");

var TERM_006 = "Cannot start: Node.js {version} is too old (need v24 or newer).";
var MINIMUM_MAJOR = 24;

var nodeVersion = process.versions.node;
if (parseInt(nodeVersion.split(".")[0], 10) < MINIMUM_MAJOR) {
  process.stderr.write(TERM_006.replace("{version}", "v" + nodeVersion) + "\n");
  process.exitCode = 1;
} else {
  var server = path.join(__dirname, "..", "dist", "server", "ramifold-server.mjs");
  // new Function keeps the dynamic import out of the parser of old Node.js versions.
  new Function("p", "return import(p)")(url.pathToFileURL(server).href);
}
