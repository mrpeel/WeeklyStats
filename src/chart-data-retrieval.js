/*global window, GARequests, console, Promise, assert, buildWeeklyUsersCharts, buildYearlyUsersCharts, buildWeeklySessionCharts*/

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
var PAGE_TITLE_EXCLUSION_FILTER = 'ga:PageTitle!=Redirect;ga:PageTitle!=(not set);ga:PageTitle!=Home page;ga:PageTitle!=www.Event-Tracking.com;ga:PageTitle!=News';
//The application names which will be reported back from Google Analytics
var APP_NAMES = ["LASSI - Land and Survey Spatial Information", "LASSI - SPEAR", "SMES - Survey Marks Enquiry Service", "SMES Edit - Survey Marks Enquiry Service",
    "VICNAMES - The Register of Geographic Names", "LASSI - TPC", "LASSI - VMT"
];
var MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var topPagesFilter;
var topBrowsersFilter;
var startDate, endDate, ids;
var lastWeekStartDate, lastWeekEndDate;
var lastYearStartDate, lastYearEndDate;
var previousYearStartDate, previousYearEndDate;

//Set-up requester with rate limit - 5 requests per second - this is a global variable so that the rate limit is applied wherever it is called
var gaRequester = new GARequests(5);

/*Base statistical data containing: 
 * dates for current week
 * overall visit numbers for all applications
 * visit numbers for individual aopplications
 */
var currentWeekdayLabels = [];
var last12MonthsLabels = [];
var allApplicationData = [];
var applicationData = {};

/** 
 * Run the data retrieval process
 * @param {string or date} - rStartDate - the start date for the comparison period as a date or date string 
 * @param {string or date} - rEndDate - the end date for the comparison period as a date or date string 
 * @param {string} - rIds - the Google Aanalytics id string
 */

function retrieveData(rStartDate, rEndDate, rIds) {
    "use strict";

    assert(isDate(rStartDate), 'retrieveData assert failed - startDate: ' + rStartDate);
    assert(new Date(rStartDate).getDay() === 1, 'retrieveData assert failed - startDate is not Monday: ' + rStartDate);
    assert(isDate(rEndDate), 'retrieveData assert failed - endDate: ' + rEndDate);
    assert(new Date(rEndDate).getDay() === 0, 'retrieveData assert failed - endDate is not Sunday: ' + rEndDate);
    assert(ids !== "", 'retrieveData assert failed - ids empty');


    startDate = rStartDate;
    endDate = rEndDate;
    ids = rIds;


    //Make sure the queue has been emptied
    gaRequester.clearQueryQueue();

    //Set date and page filters
    setDates();
    setPages();

    //Start retrieval process
    retrieveTopBrowsers(5)
        .then(function() {
            return retrieveWeeklyUsers();

        })
        .then(function() {
            buildWeeklyUsersCharts();
            return true;
        })
        .then(function() {
            return retrieveYearlyUsers();
        })
        .then(function() {
            buildYearlyUsersCharts();
            return true;
        })
        .then(function() {
            return retrieveWeeklySeesions();
        })
        .then(function() {
            buildWeeklySessionCharts();
            return true;
        })
        .catch(function(err) {
            console.log(err);
        });

}

/* 
 * Generate the week day data required for the 'X' colum of area charts which span a week
 */

function setDates() {
    "use strict";

    assert(isDate(startDate), 'setDates assert failed - startDate: ' + startDate);
    assert(isDate(endDate), 'setDates assert failed - endDate: ' + endDate);

    //Clear the current week day data and re-generate
    currentWeekdayLabels.length = 0;
    //Days are always used as an X column which must start with value 'x' - add dates for week period
    currentWeekdayLabels.push('x');
    currentWeekdayLabels.push(formatDateString(startDate, "query"));
    currentWeekdayLabels.push(formatDateString(dateAdd(startDate, "d", 1), "query"));
    currentWeekdayLabels.push(formatDateString(dateAdd(startDate, "d", 2), "query"));
    currentWeekdayLabels.push(formatDateString(dateAdd(startDate, "d", 3), "query"));
    currentWeekdayLabels.push(formatDateString(dateAdd(startDate, "d", 4), "query"));
    currentWeekdayLabels.push(formatDateString(dateAdd(startDate, "d", 5), "query"));
    currentWeekdayLabels.push(formatDateString(endDate, "query"));

    //Set up date values for last week
    lastWeekStartDate = dateAdd(startDate, "d", -7);
    lastWeekEndDate = dateAdd(endDate, "d", -7);

    //Set up date values for last year to ensure complete months go to the end of the last month
    lastYearEndDate = endDatePreviousMonth(endDate);
    //Go back a year then add one day to get the first of the following month
    lastYearStartDate = dateAdd(dateAdd(lastYearEndDate, "y", -1), "d", 1);

    //Set-up previous year time period
    previousYearStartDate = dateAdd(lastYearStartDate, "y", -1);
    previousYearEndDate = dateAdd(lastYearEndDate, "y", -1);

    //Set-up yearly month labels for the time period selected
    last12MonthsLabels.length = 0;
    for (var monthCounter = 0; monthCounter <= 11; monthCounter++) {
        last12MonthsLabels.push(MONTH_LABELS[(lastYearStartDate.getMonth() + monthCounter) % 12]);
    }

}

/**
 * Sets the page filter based on the constant APP_NAMES and initialises an object for each app name to hold data
 */
function setPages() {
    "use strict";

    //Make sure topPages string is empty
    topPagesFilter = "";

    //Build page filter which will be used in all other queries & initialise the data arrays to hold other data
    APP_NAMES.forEach(function(appName) {
        if (topPagesFilter !== "") {
            topPagesFilter = topPagesFilter + ",";
        }
        topPagesFilter = topPagesFilter + "ga:pageTitle==" + appName;

        //Initialise an object for each application returned
        applicationData[appName] = {};
    });


}

/**
 * Retrieves the top pages which are then used for all other queries. 
 * @return {Promise} a promise which wil resolve after the data has been populated
 */
function retrieveTopPages() {
    "use strict";

    assert(isDate(startDate), 'retrieveTopPages assert failed - startDate: ' + startDate);
    assert(isDate(endDate), 'retrieveTopPages assert failed - endDate: ' + endDate);


    return new Promise(function(resolve, reject) {
        //Make sure topPages string is empty
        topPagesFilter = "";

        gaRequester.queryGA({
            "start-date": startDate,
            "end-date": endDate,
            "ids": ids,
            "metrics": "ga:pageviews",
            "dimensions": "ga:pageTitle",
            "filters": PAGE_TITLE_EXCLUSION_FILTER,
            "sort": "-ga:pageviews"
        }).then(function(results) {

            //Build page filter which will be used in all other queries & initialise the data arrays to hold other data
            results.rows.forEach(function(dataRow) {
                if (topPagesFilter !== "") {
                    topPagesFilter = topPagesFilter + ",";
                }
                topPagesFilter = topPagesFilter + "ga:pageTitle==" + dataRow[0];

                //Initialise an object for each application returned
                applicationData[dataRow[0]] = {};
            });

            resolve(true);
        }).catch(function(err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * Retrieves the top browser which are then used for browser queries
 * @param {starteDate, endDate} the primary comparison period as dates or strings
            {ids} string with the GA ids
            {numberToRetrieve} the number of pages to retrieve
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveTopBrowsers(numberToRetrieve) {
    "use strict";

    assert(isDate(startDate), 'retrieveTopBrowsers assert failed - startDate: ' + startDate);
    assert(isDate(endDate), 'retrieveTopBrowsers assert failed - endDate: ' + endDate);
    assert(typeof numberToRetrieve === "number", 'retrieveTopPages assert failed - numberToRetrieve: ' + numberToRetrieve);


    return new Promise(function(resolve, reject) {
        //Make sure topPages string is empty
        topBrowsersFilter = "";

        gaRequester.queryGA({
            "start-date": startDate,
            "end-date": endDate,
            "ids": ids,
            "metrics": "ga:pageviews",
            "dimensions": "ga:browser",
            "sort": "-ga:pageviews",
            "max-results": numberToRetrieve
        }).then(function(results) {

            //Build browser filter which will be used in other queries
            results.rows.forEach(function(dataRow) {
                if (topBrowsersFilter !== "") {
                    topBrowsersFilter = topBrowsersFilter + ",";
                }
                topBrowsersFilter = topBrowsersFilter + "ga:browser==" + dataRow[0];

            });

            resolve(true);
        }).catch(function(err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * Retrieve the weekly users data for individual applications and the overall total
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveWeeklyUsers() {
    "use strict";

    assert(isDate(startDate), 'retrieveWeeklyUsers assert failed - startDate: ' + startDate);
    assert(isDate(endDate), 'retrieveWeeklyUsers assert failed - endDate: ' + endDate);


    return new Promise(function(resolve, reject) {

        gaRequester.queryGA({
            "start-date": formatDateString(startDate, "query"),
            "end-date": formatDateString(endDate, "query"),
            "ids": ids,
            "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
            "metrics": "ga:users",
            "filters": topPagesFilter,
            "sort": "ga:pageTitle,ga:date"
        }).then(function(results) {
            //map in 0 values for current week user data
            allApplicationData.currentWeekUserData = [0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].currentWeekUserData = [0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function(dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = realDate
                                            dataRow[2] = dayIndex
                                            dataRow[3] = value
                    */
                    //Record value for each application
                    applicationData[dataRow[0]].currentWeekUserData[+dataRow[2]] = +dataRow[3];
                    //Add value to all application total
                    allApplicationData.currentWeekUserData[+dataRow[2]] = allApplicationData.currentWeekUserData[+dataRow[2]] + (+dataRow[3]);
                });
            }

            return true;
        }).then(function() {

            return gaRequester.queryGA({
                "start-date": formatDateString(lastWeekStartDate, "query"),
                "end-date": formatDateString(lastWeekEndDate, "query"),
                "ids": ids,
                "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
                "metrics": "ga:users",
                "filters": topPagesFilter,
                "sort": "ga:pageTitle,ga:date"
            });
        }).then(function(results) {
            //map in 0 values for current week user data
            allApplicationData.lastWeekUserData = [0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].lastWeekUserData = [0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function(dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = realDate
                                            dataRow[2] = dayIndex
                                            dataRow[3] = value
                    */
                    //Record value for each application
                    applicationData[dataRow[0]].lastWeekUserData[+dataRow[2]] = +dataRow[3];
                    //Add value to all application total
                    allApplicationData.lastWeekUserData[+dataRow[2]] = allApplicationData.lastWeekUserData[+dataRow[2]] + (+dataRow[3]);
                });
            }

            return true;
        }).then(function() {
            //N.B. Setting max-results required - default is 1000 rows at a time - with 7 apps * 365 days need 2555 to get all in one request
            //    10,000 allows up to 27 applications
            return gaRequester.queryGA({
                "start-date": formatDateString(lastYearStartDate, "query"),
                "end-date": formatDateString(lastYearEndDate, "query"),
                "ids": ids,
                "dimensions": "ga:pageTitle,ga:dayOfWeek,ga:date",
                "metrics": "ga:users",
                "filters": topPagesFilter,
                "sort": "ga:pageTitle,ga:date",
                "max-results": 10000
            });
        }).then(function(results) {
            var appName;
            //map in empty arrays for each day of the week
            allApplicationData.lastYearMedianUserData = [0, 0, 0, 0, 0, 0, 0];

            for (appName in applicationData) {
                applicationData[appName].lastYearUserData = [
                    [],
                    [],
                    [],
                    [],
                    [],
                    [],
                    []
                ];
                applicationData[appName].lastYearMedianUserData = [0, 0, 0, 0, 0, 0, 0];
            }
            var convertedDayIndex;

            if (results) {
                results.rows.forEach(function(dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = dayofWeek Index
                                            dataRow[2] = date
                                            dataRow[3] = value
                    */

                    //Need to convert from standard week Sun (0) - Sat (6) to our week Mon (0) - Sun (6)
                    convertedDayIndex = (+dataRow[1]) - 1;
                    if (convertedDayIndex === -1) {
                        convertedDayIndex = 6;
                    }

                    //Push value to 
                    applicationData[dataRow[0]].lastYearUserData[convertedDayIndex].push(+dataRow[3]);
                });

                //Loop through each day array within each application and determine median
                for (appName in applicationData) {
                    applicationData[appName].lastYearUserData.forEach(function(dayArray, index) {
                        //Re-sort array into numeric order
                        sortNumericalArrayAsc(dayArray);
                        //Choose middle array value (median)
                        applicationData[appName].lastYearMedianUserData[index] = dayArray[Math.round(dayArray.length / 2)] || 0;
                        //Add median value for this application to the overall median value
                        allApplicationData.lastYearMedianUserData[index] = allApplicationData.lastYearMedianUserData[index] + (dayArray[Math.round(dayArray.length / 2)] || 0);
                    });
                }
            }

            resolve(true);

        }).catch(function(err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * Retrieve the yearly users data for individual applications and the overall total
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveYearlyUsers() {
    "use strict";

    assert(isDate(lastYearStartDate), 'retrieveYearlyUsers assert failed - lastYearStartDate: ' + lastYearStartDate);
    assert(isDate(lastYearEndDate), 'retrieveYearlyUsers assert failed - lastYearEndDate: ' + lastYearEndDate);
    assert(isDate(previousYearStartDate), 'retrieveYearlyUsers assert failed - previousYearStartDate: ' + previousYearStartDate);
    assert(isDate(previousYearEndDate), 'retrieveYearlyUsers assert failed - previousYearEndDate: ' + previousYearEndDate);


    return new Promise(function(resolve, reject) {

        gaRequester.queryGA({
            "start-date": formatDateString(lastYearStartDate, "query"),
            "end-date": formatDateString(lastYearEndDate, "query"),
            "ids": ids,
            "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth",
            "metrics": "ga:users",
            "filters": topPagesFilter,
            "sort": "ga:pageTitle,ga:yearMonth"
        }).then(function(results) {
            //map in 0 values for current week user data
            allApplicationData.thisYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].thisYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function(dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = yearMonth
                                            dataRow[2] = monthIndex
                                            dataRow[3] = value
                    */
                    //Record value for each application
                    applicationData[dataRow[0]].thisYearUserData[+dataRow[2]] = +dataRow[3];
                    //Add value to all application total
                    allApplicationData.thisYearUserData[+dataRow[2]] = allApplicationData.thisYearUserData[+dataRow[2]] + (+dataRow[3]);
                });
            }

            return true;
        }).then(function() {

            return gaRequester.queryGA({
                "start-date": formatDateString(previousYearStartDate, "query"),
                "end-date": formatDateString(previousYearEndDate, "query"),
                "ids": ids,
                "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth",
                "metrics": "ga:users",
                "filters": topPagesFilter,
                "sort": "ga:pageTitle,ga:nthMonth"
            });
        }).then(function(results) {
            //map in 0 values for current week user data
            allApplicationData.previousYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].previousYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function(dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = yearMonth
                                            dataRow[2] = monthIndex
                                            dataRow[3] = value
                    */
                    //Record value for each application
                    applicationData[dataRow[0]].previousYearUserData[+dataRow[2]] = +dataRow[3];
                    //Add value to all application total
                    allApplicationData.previousYearUserData[+dataRow[2]] = allApplicationData.previousYearUserData[+dataRow[2]] + (+dataRow[3]);
                });
            }

            resolve(true);

        }).catch(function(err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * Retrieve the weekly session data for individual applications and the overall total
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveWeeklySeesions() {
    "use strict";

    assert(isDate(startDate), 'retrieveWeeklySeesions assert failed - startDate: ' + startDate);
    assert(isDate(endDate), 'retrieveWeeklySeesions assert failed - endDate: ' + endDate);


    return new Promise(function(resolve, reject) {

        gaRequester.queryGA({
            "start-date": formatDateString(startDate, "query"),
            "end-date": formatDateString(endDate, "query"),
            "ids": ids,
            "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
            "metrics": "ga:avgSessionDuration",
            "filters": topPagesFilter,
            "sort": "ga:pageTitle,ga:date"
        }).then(function(results) {
            //map in 0 values for current week user data
            allApplicationData.currentWeekSessionData = [0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].currentWeekSessionData = [0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function(dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = realDate
                                            dataRow[2] = dayIndex
                                            dataRow[3] = value
                    */
                    //Record value for each application
                    applicationData[dataRow[0]].currentWeekSessionData[+dataRow[2]] = roundTo2((+dataRow[3] / 60));
                    //Add value to all application total
                    allApplicationData.currentWeekSessionData[+dataRow[2]] = allApplicationData.currentWeekSessionData[+dataRow[2]] + roundTo2((+dataRow[3] / 60));
                });

                //Make overall average session for each day duration by dividing the overall number by the number of apps
                for (var dayCounter = 0; dayCounter < allApplicationData.currentWeekSessionData.length; dayCounter++) {
                    allApplicationData.currentWeekSessionData[dayCounter] = roundTo2(allApplicationData.currentWeekSessionData[dayCounter] / APP_NAMES.length);

                }
            }

            return true;
        }).then(function() {

            return gaRequester.queryGA({
                "start-date": formatDateString(lastWeekStartDate, "query"),
                "end-date": formatDateString(lastWeekEndDate, "query"),
                "ids": ids,
                "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
                "metrics": "ga:avgSessionDuration",
                "filters": topPagesFilter,
                "sort": "ga:pageTitle,ga:date"
            });
        }).then(function(results) {
            //map in 0 values for current week user data
            allApplicationData.lastWeekSessionData = [0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].lastWeekSessionData = [0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function(dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = realDate
                                            dataRow[2] = dayIndex
                                            dataRow[3] = value
                    */
                    //Record value for each application
                    applicationData[dataRow[0]].lastWeekSessionData[+dataRow[2]] = roundTo2((+dataRow[3] / 60));
                    //Add value to all application total
                    allApplicationData.lastWeekSessionData[+dataRow[2]] = allApplicationData.lastWeekSessionData[+dataRow[2]] + roundTo2((+dataRow[3] / 60));
                });

                //Make overall average session for each day duration by dividing the overall number by the number of apps
                for (var dayCounter = 0; dayCounter < allApplicationData.lastWeekSessionData.length; dayCounter++) {
                    allApplicationData.lastWeekSessionData[dayCounter] = roundTo2(allApplicationData.lastWeekSessionData[dayCounter] / APP_NAMES.length);
                }
            }

            return true;
        }).then(function() {
            //N.B. Setting max-results required - default is 1000 rows at a time - with 7 apps * 365 days need 2555 to get all in one request
            //    10,000 allows up to 27 applications
            return gaRequester.queryGA({
                "start-date": formatDateString(lastYearStartDate, "query"),
                "end-date": formatDateString(lastYearEndDate, "query"),
                "ids": ids,
                "dimensions": "ga:pageTitle,ga:dayOfWeek,ga:date",
                "metrics": "ga:avgSessionDuration",
                "filters": topPagesFilter,
                "sort": "ga:pageTitle,ga:date",
                "max-results": 10000
            });
        }).then(function(results) {
            var appName;
            //map in empty arrays for each day of the week
            allApplicationData.lastYearMedianSessionData = [0, 0, 0, 0, 0, 0, 0];

            for (appName in applicationData) {
                applicationData[appName].lastYearSessionData = [
                    [],
                    [],
                    [],
                    [],
                    [],
                    [],
                    []
                ];
                applicationData[appName].lastYearMedianSessionData = [0, 0, 0, 0, 0, 0, 0];
            }
            var convertedDayIndex;

            if (results) {
                results.rows.forEach(function(dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = dayofWeek Index
                                            dataRow[2] = date
                                            dataRow[3] = value
                    */

                    //Need to convert from standard week Sun (0) - Sat (6) to our week Mon (0) - Sun (6)
                    convertedDayIndex = (+dataRow[1]) - 1;
                    if (convertedDayIndex === -1) {
                        convertedDayIndex = 6;
                    }

                    //Push value to 
                    applicationData[dataRow[0]].lastYearSessionData[convertedDayIndex].push(roundTo2((+dataRow[3] / 60)));
                });

                //Loop through each day array within each application and determine median
                for (appName in applicationData) {
                    applicationData[appName].lastYearSessionData.forEach(function(dayArray, index) {
                        //Re-sort array into numeric order
                        sortNumericalArrayAsc(dayArray);
                        //Choose middle array value (median)
                        applicationData[appName].lastYearMedianSessionData[index] = dayArray[Math.round(dayArray.length / 2)] || 0;
                        //Add median value for this application to the overall median value
                        allApplicationData.lastYearMedianSessionData[index] = allApplicationData.lastYearMedianSessionData[index] + (dayArray[Math.round(dayArray.length / 2)] || 0);
                    });
                }

                //Make overall average session for each day duration by dividing the overall number by the number of apps
                for (var dayCounter = 0; dayCounter < allApplicationData.lastYearMedianSessionData.length; dayCounter++) {
                    allApplicationData.lastYearMedianSessionData[dayCounter] = roundTo2(allApplicationData.lastYearMedianSessionData[dayCounter] / APP_NAMES.length);

                }

            }

            resolve(true);

        }).catch(function(err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * Takes a number value and trims is to a maximum of 2 decimal places
 * @params {number} numValue -  a numberor string in a number format
 * @return {number} a number trimeed to 2 decimal places
 */
function roundTo2(numValue) {
    "use strict";

    //Check that this really is a number value
    assert(typeof numValue === "number", 'roundTo2 assert failed - numValue: ' + numValue);


    return parseFloat(parseFloat(numValue).toFixed(2));
}

/**
 * Takes a date string and returns true or flase depending on whether it is a date
 * @params {Date / String} a date or string in a format which can be converte4d to a date
 * @return {Date} a date with the new value
 */
function isDate(dateValue) {
    "use strict";

    var newDate = new Date(dateValue);

    //Check that this really is a date - it must be able to return the month
    if (isNaN(newDate.getMonth())) {
        return false;
    } else {
        return true;
    }

}

/**
 * Takes a date and returns the end of the previous month
 * @params {Date / String} a date or string in a format which can be converte4d to a date
 * @return {Date} a date with the new value
 */
function endDatePreviousMonth(dateValue) {
    "use strict";

    //Check that this really is a date
    assert(isDate(dateValue), 'endDatePreviousMonth assert failed - dateValue: ' + dateValue);

    var newDate = new Date(dateValue);


    //Set to one day before the start of the month
    newDate.setDate(0);

    return newDate;

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

    //Check that this really is a date
    assert(isDate(dateValue), 'dateAdd assert failed - dateValue: ' + dateValue);
    assert(unit === "d" || unit === "m" || unit === "y", 'dateAdd assert failed - unit: ' + unit);
    assert(typeof number === "number", 'dateAdd assert failed - number: ' + number);

    var newDate = new Date(dateValue);
    var dateComponents = {};

    dateComponents.years = newDate.getFullYear();
    dateComponents.months = newDate.getMonth();
    dateComponents.days = newDate.getDate();

    if (unit === "d") {
        newDate.setDate(dateComponents.days + number);
    } else if (unit === "m") {
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

    //Check that this really is a date
    assert(isDate(dateExpression), 'formatDateString assert failed - dateExpression: ' + dateExpression);
    assert(format === "query" || format === "display", 'formatDateString assert failed - format: ' + format);

    var sourceDate = new Date(dateExpression);
    var dateComponents = {};


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

    numericalArray.sort(function(a, b) {
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

    numericalArray.sort(function(a, b) {
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