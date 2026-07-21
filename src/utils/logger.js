"use strict";

function write(level, message, context = undefined) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message
    };

    if (context !== undefined) {
        entry.context = context;
    }

    console.log(JSON.stringify(entry));
}

const logger = {
    info(message, context) {
        write("info", message, context);
    },

    warning(message, context) {
        write("warning", message, context);
    },

    error(message, context) {
        write("error", message, context);
    }
};

module.exports = {
    logger
};
