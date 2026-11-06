import test from "node:test";
import assert from "node:assert/strict";
import { APPEARANCE_KEY, readAppearance, resolveTheme } from "../src/appearance.mjs";

test("appearance accepts known preferences and falls back safely when storage is unavailable", () => {
  for (const value of ["light", "dark", "system"]) {
    assert.equal(readAppearance({ getItem(key) { assert.equal(key, APPEARANCE_KEY); return value; } }), value);
  }
  assert.equal(readAppearance({ getItem: () => "invalid" }), "system");
  assert.equal(readAppearance({ getItem() { throw new Error("Storage blocked"); } }), "system");
});

test("explicit appearance overrides the system while system mode follows it", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});
