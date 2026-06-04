/* eslint-env node */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadPopupScript() {
  const popupPath = path.join(__dirname, "..", "src", "js", "popup.js");
  const context = {
    chrome: {
      tabs: {
        query: function () {},
      },
    },
    document: {
      addEventListener: function () {},
    },
    JSON,
    navigator: {},
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(popupPath, "utf8"), context);

  return context;
}

test("getFormatterDepth uses default depth unless search is active", function () {
  const popup = loadPopupScript();

  assert.equal(popup.getFormatterDepth(""), 2);
  assert.equal(popup.getFormatterDepth("entity"), Infinity);
});

test("manual expand and collapse depth overrides automatic search expansion", function () {
  const popup = loadPopupScript();

  popup.setExpandDepth(0);
  assert.equal(popup.getFormatterDepth("entity"), 0);

  popup.setExpandDepth(Infinity);
  assert.equal(popup.getFormatterDepth(""), Infinity);
});

test("getCopyText returns formatted JSON for the displayed record", function () {
  const popup = loadPopupScript();
  const record = {
    recordType: "salesorder",
    bodyFields: {
      entity: "Acme",
    },
  };

  assert.equal(
    popup.getCopyText(record),
    '{\n  "recordType": "salesorder",\n  "bodyFields": {\n    "entity": "Acme"\n  }\n}',
  );
});
