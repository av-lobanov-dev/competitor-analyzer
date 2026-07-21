"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function findJavaScriptFiles(directory) {
    if (!fs.existsSync(directory)) {
        return [];
    }

    const result = [];

    for (const entry of fs.readdirSync(directory, {
        withFileTypes: true
    })) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            result.push(...findJavaScriptFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
            result.push(fullPath);
        }
    }

    return result;
}

const files = [
    ...findJavaScriptFiles("src"),
    ...findJavaScriptFiles("tests"),
    __filename
];

let errors = 0;

for (const file of files) {
    const result = spawnSync(
        process.execPath,
        ["--check", file],
        {
            encoding: "utf8"
        }
    );

    if (result.status !== 0) {
        errors += 1;
        console.error(`ERROR: ${file}`);
        console.error(result.stderr);
    }
}

if (errors > 0) {
    console.error(`JavaScript syntax errors: ${errors}`);
    process.exitCode = 1;
} else {
    console.log(`JavaScript syntax OK: ${files.length} files`);
}
