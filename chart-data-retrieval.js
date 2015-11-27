/*global window, GARequests, console, Promise, assert*/

/** 
 * Retrieves the data required for each of the charts and executes required processing, then returns the data as an object.
 * All functions return promises which will resolve with the following format:
    {
        columnData: [ProcessedData],
        labels: [labelsData - if required],
        seriesLabels: [seriesLabels - if required],
        
    }
        
 */

//Set up assertion variables
var ASSERT_ENABLED = true;
var ASSERT_ERROR = true;
var topPagesFilter;

//Set-up requester with rate limit - 5 requests per second - this is a global variable so that the rate limit is applied wherever it is called
var gaRequester = new GARequests(5);

/**
 * Retrieves the top n pages which are then used for all other queries
 * @param {starteDate, endDate} the primary comparison period as dates or strings
            {ids} string with the GA ids
            {numberToRetrieve} the number of pages to retrieve
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveTopPages(startDate, endDate, ids, numberToRetrieve) {
    "use strict";

    assert(!isNaN(startDate.getMonth()), 'retrieveTopPages assert failed - startDate: ' + startDate);
    assert(!isNaN(endDate.getMonth()), 'retrieveTopPages assert failed - endDate: ' + endDate);
    assert(typeof numberToRetrieve === "number", 'retrieveTopPages assert failed - numberToRetrieve: ' + numberToRetrieve);


    return new Promise(function (resolve, reject) {
        //Make sure topPages string is empty
        topPagesFilter = "";

        gaRequester.queryGA({
            "start-date": startDate,
            "end-date": endDate,
            "ids": ids,
            "dimensions": "ga:pageTitle",
            "metrics": "ga:pageviews",
            "sort": "-ga:pageviews",
            "max-results": numberToRetrieve
        }).then(function (results) {

            results.rows.forEach(function (dataRow) {
                if (topPagesFilter !== "") {
                    topPagesFilter = topPagesFilter + ",";
                }
                topPagesFilter = topPagesFilter + "ga:pageTitle==" + dataRow[0];
            });
        }).catch(function (err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * Retrieve the weekly users 
 * @param {starteDate, endDate} the primary comparison period - formatted strings in format"YYYY-MM-DD"
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveWeeklyUsers(startDate, endDate, ids) {
    "use strict";

    assert(!isNaN(startDate.getMonth()), 'retrieveWeeklyUsers assert failed - startDate: ' + startDate);
    assert(!isNaN(endDate.getMonth()), 'retrieveWeeklyUsers assert failed - endDate: ' + endDate);


    return new Promise(function (resolve, reject) {
        //
        var columnData = [[]];
        var previousWeekStartDate = dateAdd(startDate, "w", -7),
            previousWeekEndDate = dateAdd(endDate, "w", -7),
            lastYearStartDate = dateAdd(endDate, "y", -1),
            lastYearEndDate = endDate;


        gaRequester.queryGA({
            "start-date": startDate,
            "end-date": endDate,
            "ids": ids,
            "dimensions": "ga:date,ga:dayOfWeek",
            "metrics": "ga:users",
            "filters": topPagesFilter,
            "sort"
        }).then(function (results) {

            var xColumn = [],
                currentWeekColumn = [];

            //First column contains dates used for heading with series name 'x'
            xColumn.push("x");
            //Second column for weekly contains series name 'Week starting DD/MM/YYYY' and values
            currentWeekColumn.push('Week starting ' + formatDateString(startDate, "display"));

            results.rows.forEach(function (dataRow) {
                xColumn.push(convertGADate(dataRow[0]));
                currentWeekColumn.push(dataRow[2]);
            });
            console.table(results.columHeaders);
            console.table();
            console.log(xColumn);
            console.log(currentWeekColumn);
        }).catch(function (err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * converts the date string used for querying to a formated date string which can be displayed
 * @params {Date / String} a date or string in a format which can be converte4d to a date
            {string} the unit to change by "d" days, "w" weeks, "y" years
            {number} number to change, positive number for futures, negative number for past
 * @return {Date} a date with the new value
 */
function dateAdd(dateValue, unit, number) {
    "use strict";

    var newDate = new Date(dateValue);
    var dateComponents = {};

    //Check that this really is a date
    assert(!isNaN(newDate.getMonth()), 'dateAdd assert failed - dateValue: ' + dateValue);
    assert(unit === "d" || unit === "w" || unit === "y", 'dateAdd assert failed - unit: ' + unit);
    assert(typeof number === "number", 'dateAdd assert failed - number: ' + number);

    dateComponents.years = newDate.getFullYear();
    dateComponents.months = newDate.getMonth();
    dateComponents.days = newDate.getDate();

    if (unit === "d") {
        newDate.setDate(dateComponents.days + number);
    } else if (unit === "w") {
        newDate.setMonth(dateComponents.months + number);
    } else if (unit === "y") {
        newDate.setFullYear(dateComponents.years + number);
    }

    return newDate;

}

/**
 * Converts the date or date string used for querying to a formated date string which can be displayed
 * @param   {String / Date} a date string in an acceptable date format
            {String} the format to output - "query", "display"
 * @return {String} a date string formatted for GA querying: YYYY-MM-DD or display: DD/MM/YYYY
 */
function formatDateString(dateExpression, format) {
    "use strict";


    var sourceDate = new Date(dateExpression);
    var dateComponents = {};

    //Check that this really is a date
    assert(!isNaN(sourceDate.getMonth()), 'formatDateString assert failed - dateExpression: ' + dateExpression);
    assert(format === "query" || format === "display", 'formatDateString assert failed - format: ' + format);

    dateComponents.years = sourceDate.getFullYear();
    dateComponents.months = sourceDate.getMonth() + 1; //Add 1 because getMonth is zero-based - 0-11
    dateComponents.days = sourceDate.getDate();

    if (format === "query") {
        return dateComponents.years + "-" + zeroPad(dateComponents.months, 2) + "-" + zeroPad(dateComponents.days, 2);
    } else {
        return zeroPad(dateComponents.days, 2) + "/" + zeroPad(dateComponents.months, 2) + "/" + dateComponents.years;
    }

}

/**
 * converts the GA date string to a date string which can be used
 * @param {String} a date string in GA format: YYYYMMDD
            {String} the format to output - "query", "display"}
 * @return {String} a string formatted for GA querying: YYYY-MM-DD or display: DD/MM/YYYY
 */
function convertGADate(gaDateString, format) {
    "use strict";

    //Check that this really is an eight digit string
    assert(gaDateString.length === 8 && typeof gaDateString === "number", 'convertGADate assert failed - gaDateString: ' + gaDateString);
    assert(format === "query" || format === "display", 'convertGADate assert failed - format: ' + format);

    if (format === "query") {
        return gaDateString.slice(0, 4) + '-' + gaDateString.slice(4, 6) + '-' + gaDateString.slice(6, 8);
    } else {
        return gaDateString.slice(6, 8) + '/' + gaDateString.slice(4, 6) + '/' + gaDateString.slice(0, 4);
    }

}

/**
 * Sorts a numerical array into ascending order.
 * @param {numericalArray} an array of numbers
 * @return {mericalArray} the sorted array
 */
function sortNumericalArrayAsc(numericalArray) {
    "use strict";

    assert(Array.isArray(numericalArray), 'sortNumericalArrayAsc assert failed - numericalArray: ' + numericalArray);

    numericalArray.sort(function (a, b) {
        return a - b;
    });

}

/**
 * Sorts a numerical array into descending order.
 * @param {numericalArray} an array of numbers
 * @return {mericalArray} the sorted array
 */
function sortNumericalArrayDesc(numericalArray) {
    "use strict";

    assert(Array.isArray(numericalArray), 'sortNumericalArrayDesc assert failed - numericalArray: ' + numericalArray);

    numericalArray.sort(function (a, b) {
        return b - a;
    });

}

/**
 * Pads a number with leading zeroes when required
 * @param  {number} the source number
            {number} the number of digits expected
 * @return {mericalArray} the sorted array
 */
function zeroPad(number, length) {

    assert(typeof number === "number", 'zeroPad assert failed - number: ' + number);
    assert(typeof length === "number", 'zeroPad assert failed - length: ' + length);

    var paddedNumber = number.toString();

    while (paddedNumber.length < length) {
        paddedNumber = "0" + paddedNumber;
    }

    return paddedNumber;
}
