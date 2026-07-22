"use strict";

const {
    analyzeStructure
} = require("../analyzers/structure-analyzer");

const {
    analyzeSeo
} = require("../analyzers/seo-analyzer");


function analyze(job) {

    switch (job.analysis_type) {

        case "site_structure":
            return analyzeStructure(job);

        case "seo_analysis":
            return analyzeSeo(job);

        default:
            throw new Error(
                `Неизвестный тип анализа: ${job.analysis_type}`
            );
    }
}


module.exports = {
    analyze
};
