var request = require('request')
var cheerio = require('cheerio')
const ObjectsToCsv = require('objects-to-csv');

// const QUESTION_BASE_URL = "https://stackoverflow.com/questions/"
const QUESTION_BASE_URL = "https://academia.stackexchange.com/questions/"
const ROOT_URL = "?tab=Votes"
const QUESTION_MATCH_REGEX = /\/questions\/\d+/g

var requestStack = ["?sort=MostVotes"]
var DATA = {}

var threads = []

function startScraping() {
    request(QUESTION_BASE_URL + requestStack[0],
        (error, response, html) => {
            if (!error && response.statusCode == 200) {
                const $ = cheerio.load(html);
                fetchNewQuestionLinks($);
                requestStack.shift()
                for (let index = 0; index <= 5; index++) {
                    threads.push(scrapeNext())                    
                }
            }
            else {
                console.error("ERROR REQUESTING THE PAGE. HTTP STATUS CODE : " + response.statusCode);
            }
        }
    )
}

function scrapeNext() {
    let currentQuestionId = requestStack.shift();
    console.log("SCRAPING : " + currentQuestionId, "REQUEST STACK : " + requestStack.length);
    request(QUESTION_BASE_URL + currentQuestionId,
        (error, response, html) => {
            if (!error && response.statusCode == 200) {
                parsePage(html, currentQuestionId);
                
                threads.shift()
                threads.push(scrapeNext())
            }
            else {
                console.error("ERROR REQUESTING THE PAGE. HTTP STATUS CODE : " + response.statusCode);
            }
        }
    )
}

startScraping()

function parsePage(html, questionId) {
    const $ = cheerio.load(html)
    let questionUpvoteCount = $('#question .js-vote-count').attr('data-value');
    let answersCount = $('#answers #answers-header h2').attr('data-answercount');
    let questionText = $('#question-header h1 a').text()
    console.log("#Qv:" + questionUpvoteCount, "#A: " + answersCount);
    if (DATA[questionId]) {
        DATA[questionId][R] = DATA[questionId][R] + 1;
        console.log("FOUND A REFERENCE FOR ", DATA[questionId]);
    } else {
        DATA[questionId] = {
            questionId: questionId,
            questionText: questionText,
            questionUpvoteCount: questionUpvoteCount,
            answersCount: answersCount,
            questionURL: QUESTION_BASE_URL + questionId,
            referenceCount: 1
        }
    }
    fetchNewQuestionLinks($)
    
}

function fetchNewQuestionLinks($) {
    console.log("TOTAL LINKS ON THE PAGE ARE : ", $('a').length);
    $('a').each(function () {
        let href = $(this).attr('href')
        if (href) {
            // console.log(href);
            if (href.match(QUESTION_MATCH_REGEX)) {
                let tag = href.match(/questions\/(\d*)\//);
                if (tag) {
                    requestStack.push(tag[1])
                }
            }
        }
    })
}


process.on('SIGINT', function () {
    console.log("SAVING THE FILE...");
    const csv = new ObjectsToCsv(Object.values(DATA));
    csv.toDisk('./data.csv').then(
        () => {
            console.log("FILE SAVED AS 'data.csv'")
            process.exit()
        }
    );

});