// Importing necessary libraries
var request = require('request')
var cheerio = require('cheerio')
const ObjectsToCsv = require('objects-to-csv');
const cliProgress = require('cli-progress');

// const QUESTION_BASE_URL = "https://stackoverflow.com/questions/"

// Uncomment the following lines to scrape the respective website
// const QUESTION_BASE_URL = "https://academia.stackexchange.com/questions/"
const QUESTION_BASE_URL = "https://superuser.com/questions/";
const ROOT_URL = "?tab=Votes";
const QUESTION_MATCH_REGEX = /\/questions\/\d+/g;
const CSV_FILENAME = "data.csv";
const SCRAPE_TARGET = 10; //maximum pages to scrape. Set 0 for infinite.
const MAX_THREAD_COUNT = 5;
var requestStack = [ROOT_URL]
var DATA = {}
var errorCount = 0;
var threads = []

const progressBar = new cliProgress.SingleBar({
    format: `SCRAPING Progress | {bar} | {percentage}% | {value}/{total} | Error: {errorCount} | Threads : {threads}`,
    hideCursor: true
}, cliProgress.Presets.shades_classic);
progressBar.start(SCRAPE_TARGET);

function startScraping() {
    process.stdout.write('\033c');
    request(QUESTION_BASE_URL + requestStack[0],
        (error, response, html) => {
            if (!error && response.statusCode == 200) {
                const $ = cheerio.load(html);
                fetchNewQuestionLinks($);
                requestStack.shift()
                for (let index = 0; index <= MAX_THREAD_COUNT; index++) {
                    threads.push(scrapeNext())
                }
            }
            else {
                console.error("Error requesting the root page. Please restart the script. HTTP STATUS CODE : " + response.statusCode);
                errorCount++;
            }
        }
    )
}

function scrapeNext() {
    let currentQuestionId = requestStack.shift();
    // process.stdout.write('\033c');
    // console.log("SCRAPING : " + QUESTION_BASE_URL + currentQuestionId);
    request(QUESTION_BASE_URL + currentQuestionId,
        (error, response, html) => {
            if (!error && response.statusCode == 200) {
                parsePage(html, currentQuestionId);
            }
            else {
                // console.error("ERROR REQUESTING THE PAGE. HTTP STATUS CODE : " + response.statusCode);
                errorCount++;
            }
            progressBar.update(Object.values(DATA).length,{errorCount:errorCount,threads:threads.length});
            threads.shift()
            if (Object.values(DATA).length<SCRAPE_TARGET){
                threads.push(scrapeNext());
            } else if(!SCRAPE_TARGET){
                threads.push(scrapeNext());
            }else if(Object.values(DATA).length==SCRAPE_TARGET){
                threads = null;
                progressBar.stop();
                saveToCSV();
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
    if (DATA[questionId]) {
        DATA[questionId]["referenceCount"] = DATA[questionId]["referenceCount"] + 1;
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
    $('a').each(function () {
        let href = $(this).attr('href')
        if (href) {
            if (href.match(QUESTION_MATCH_REGEX)) {
                let tag = href.match(/questions\/(\d*)\//);
                if (tag) {
                    requestStack.push(tag[1])
                }
            }
        }
    })
}

function saveToCSV() {
    console.log(`SCRAPING RESULTS:`);
    console.log(`PAGES SCRAPED: ${Object.values(DATA).length}`);
    console.log(`QUESTION LINKS FOUND: ${requestStack.length}`);
    console.log("\nSAVING THE FILE...");
    const csv = new ObjectsToCsv(Object.values(DATA));
    csv.toDisk('./' + CSV_FILENAME).then(
        () => {
            console.log("FILE SAVED AS " + CSV_FILENAME)
            process.exit()
        }
    );
}

process.on('SIGINT', function () {
    progressBar.stop();
    saveToCSV()
});
