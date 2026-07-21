"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { sleep } = require("../src/utils/sleep");

test("sleep resolves asynchronously", async () => {
    const startedAt = Date.now();

    await sleep(10);

    assert.ok(Date.now() - startedAt >= 5);
});
