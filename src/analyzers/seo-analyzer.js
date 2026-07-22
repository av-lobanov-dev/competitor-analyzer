"use strict";

function analyzeSeo(job) {

    const structure = job.page_structure || {};

    const page =
        structure.page || {};

    const counts =
        structure.counts || {};


    const title =
        job.page_title || "";

    const textLength =
        typeof job.page_text === "string"
            ? job.page_text.length
            : 0;


    const links =
        Number(counts.links || 0);

    const images =
        Number(counts.images || 0);

    const headings =
        Number(counts.headings || 0);

    const products =
        Number(counts.possibleProductCards || 0);



    let score = 100;

    const problems = [];

    const recommendations = [];



    if (!title) {

        score -= 20;

        problems.push(
            "Отсутствует Title страницы"
        );

        recommendations.push(
            "Добавить уникальный Title"
        );

    } else {

        if (title.length < 30) {

            score -= 5;

            problems.push(
                "Title слишком короткий"
            );

        }


        if (title.length > 70) {

            score -= 5;

            problems.push(
                "Title слишком длинный"
            );

        }
    }



    if (textLength < 500) {

        score -= 15;

        problems.push(
            "Недостаточно текстового содержания"
        );

        recommendations.push(
            "Добавить больше полезного текста"
        );

    }



    if (headings === 0) {

        score -= 10;

        problems.push(
            "Нет заголовков H1-H6"
        );

    }



    if (links < 10) {

        score -= 10;

        problems.push(
            "Мало внутренних ссылок"
        );

    }



    if (images === 0) {

        score -= 10;

        problems.push(
            "Нет изображений"
        );

    }



    if (products >= 5) {

        recommendations.push(
            "Страница похожа на каталог товаров"
        );

    }



    if (score < 0) {
        score = 0;
    }



    return {

        analysis_type:
            "seo_analysis",


        page: {

            title,

            url:
                job.final_url,

            language:
                page.language || null

        },


        seo: {

            score,

            grade:
                score >= 80
                    ? "good"
                    : score >= 50
                        ? "average"
                        : "poor",

            metrics: {

                textLength,

                links,

                images,

                headings,

                products

            },


            problems,

            recommendations

        }

    };

}


module.exports = {
    analyzeSeo
};
