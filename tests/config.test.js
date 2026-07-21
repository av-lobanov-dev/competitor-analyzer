"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    getEnv,
    getIntegerEnv
} = require("../src/config/env");

test("getEnv returns environment value", () => {
    process.env.TEST_CONFIG_VALUE = "configured";

    assert.equal(
        getEnv("TEST_CONFIG_VALUE"),
        "configured"
    );

    delete process.env.TEST_CONFIG_VALUE;
});

test("getEnv returns fallback", () => {
    delete process.env.TEST_CONFIG_FALLBACK;

    assert.equal(
        getEnv("TEST_CONFIG_FALLBACK", "fallback"),
        "fallback"
    );
});

test("getIntegerEnv parses integer", () => {
    process.env.TEST_INTEGER_VALUE = "42";

    assert.equal(
        getIntegerEnv("TEST_INTEGER_VALUE", 5),
        42
    );

    delete process.env.TEST_INTEGER_VALUE;
});
