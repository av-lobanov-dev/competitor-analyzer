"use strict";

function analyzeStructure(job) {
    const structure = job.page_structure || {};

    const counts = structure.counts || {};

    const possibleProducts =
        Number(counts.possibleProductCards || 0);

    const links =
        Number(counts.links || 0);

    const headings =
        Number(counts.headings || 0);

    const images =
        Number(counts.images || 0);

    return {
        analysis_type: "site_structure",

        page: {
            title: job.page_title,
            url: job.final_url
        },

        content: {
            textLength:
                typeof job.page_text === "string"
                    ? job.page_text.length
                    : 0
        },

        structure: {
            headings,
            links,
            images,
            buttons:
                Number(counts.buttons || 0),
            possibleProductCards:
                possibleProducts
        },

        signals: {
            hasProducts:
                possibleProducts > 0,

            hasCatalogLikeStructure:
                possibleProducts >= 5,

            hasRichNavigation:
                links >= 20
        }
    };
}

module.exports = {
    analyzeStructure
};
