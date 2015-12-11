/*global window, GARequests, console, Promise, assert, buildWeeklyUsersCharts, buildYearlyUsersCharts, buildWeeklySessionCharts, buildYearlyBrowserCharts, buildYearlyPagesChart*/
/*global buildVisitorReturnCharts*/

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
var APP_LABELS = ["LASSI", "LASSI - SPEAR", "SMES", "SMES Edit", "VICNAMES", "LANDATA TPI", "LANDATA VMT"];
var MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var topPagesFilter;
var topBrowsersArray = [];
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
        /*.then(function () {
            return retrieveYearlyPages();
        })
        .then(function () {
            buildYearlyPagesChart();
            return true;
        })
        .then(function () {
            return retrieveWeeklyUsers();

        })
        .then(function () {
            buildWeeklyUsersCharts();
            return true;
        })
        .then(function () {
            return retrieveYearlyUsers();
        })
        .then(function () {
            buildYearlyUsersCharts();
            return true;
        })
        .then(function () {
            return retrieveWeeklySessions();
        })
        .then(function () {
            buildWeeklySessionCharts();
            return true;
        })
        .then(function () {
            return retrieveYearlyBrowsers();
        })
        .then(function () {
            buildYearlyBrowserCharts();
            return true;
        })*/
        .then(function () {
            return retrieveVisitorReturns();
        })
        .then(function () {
            buildVisitorReturnCharts();
            return true;
        })
        .catch(function (err) {
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
    APP_NAMES.forEach(function (appName) {
        if (topPagesFilter !== "") {
            topPagesFilter = topPagesFilter + ",";
        }
        topPagesFilter = topPagesFilter + "ga:pageTitle==" + appName;

        //Initialise an object for each application returned
        applicationData[appName] = {};
    });


}

/**
 * Retrieves the yearly application (page) visit breakdown across apps. 
 * @return {Promise} a promise which wil resolve after the data has been populated
 */
function retrieveYearlyPages() {
    "use strict";

    assert(isDate(startDate), 'retrieveYearlyPages assert failed - startDate: ' + startDate);
    assert(isDate(endDate), 'retrieveYearlyPages assert failed - endDate: ' + endDate);
    assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveYearlyPages assert failed - topPagesFilter: ' + topPagesFilter);

    return new Promise(function (resolve, reject) {

        gaRequester.queryGA({
            "start-date": formatDateString(lastYearStartDate, "query"),
            "end-date": formatDateString(lastYearEndDate, "query"),
            "ids": ids,
            "metrics": "ga:pageviews",
            "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth",
            "filters": topPagesFilter,
            "sort": "ga:pageTitle,ga:yearMonth"
        }).then(function (results) {


            allApplicationData.pageData = {};
            allApplicationData.pageTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            APP_NAMES.forEach(function (appName) {
                allApplicationData.pageData[appName] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            });


            if (results) {
                results.rows.forEach(function (dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = yearMonth
                                            dataRow[2] = monthIndex
                                            dataRow[3] = value
                    */
                    //Record value
                    allApplicationData.pageData[dataRow[0]][+dataRow[2]] = (+dataRow[3]);
                    //Add value to total
                    allApplicationData.pageTotals[+dataRow[2]] = allApplicationData.pageTotals[+dataRow[2]] + (+dataRow[3]);
                });

                //Need to convert raw numbers to percentages - using month totals for overall figures
                APP_NAMES.forEach(function (appName) {
                    for (var monthCounter = 0; monthCounter < 12; monthCounter++) {
                        allApplicationData.pageData[appName][monthCounter] = roundTo2(allApplicationData.pageData[appName][monthCounter] /
                            allApplicationData.pageTotals[monthCounter] * 100);
                    }
                });


            }

            resolve(true);
        }).catch(function (err) {
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


    return new Promise(function (resolve, reject) {
        //Make sure topPages string is empty
        topBrowsersFilter = "";

        gaRequester.queryGA({
            "start-date": formatDateString(startDate, "query"),
            "end-date": formatDateString(endDate, "query"),
            "ids": ids,
            "metrics": "ga:pageviews",
            "dimensions": "ga:browser",
            "sort": "-ga:pageviews",
            "max-results": numberToRetrieve
        }).then(function (results) {
            topBrowsersArray.length = 0;

            //Build browser filter and array which will be used in other queries
            if (results) {
                results.rows.forEach(function (dataRow) {
                    if (topBrowsersFilter !== "") {
                        topBrowsersFilter = topBrowsersFilter + ",";
                    }
                    topBrowsersFilter = topBrowsersFilter + "ga:browser==" + dataRow[0];
                    topBrowsersArray.push(dataRow[0]);
                });
            }

            resolve(true);
        }).catch(function (err) {
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
    assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveWeeklyUsers assert failed - topPagesFilter: ' + topPagesFilter);


    return new Promise(function (resolve, reject) {

        gaRequester.queryGA({
            "start-date": formatDateString(startDate, "query"),
            "end-date": formatDateString(endDate, "query"),
            "ids": ids,
            "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
            "metrics": "ga:users",
            "filters": topPagesFilter,
            "sort": "ga:pageTitle,ga:date"
        }).then(function (results) {
            //map in 0 values for current week user data
            allApplicationData.currentWeekUserData = [0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].currentWeekUserData = [0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function (dataRow) {
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
        }).then(function () {

            return gaRequester.queryGA({
                "start-date": formatDateString(lastWeekStartDate, "query"),
                "end-date": formatDateString(lastWeekEndDate, "query"),
                "ids": ids,
                "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
                "metrics": "ga:users",
                "filters": topPagesFilter,
                "sort": "ga:pageTitle,ga:date"
            });
        }).then(function (results) {
            //map in 0 values for current week user data
            allApplicationData.lastWeekUserData = [0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].lastWeekUserData = [0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function (dataRow) {
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
        }).then(function () {
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
        }).then(function (results) {
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
                results.rows.forEach(function (dataRow) {
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
                    applicationData[appName].lastYearUserData.forEach(function (dayArray, index) {
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

        }).catch(function (err) {
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


    return new Promise(function (resolve, reject) {

        gaRequester.queryGA({
            "start-date": formatDateString(lastYearStartDate, "query"),
            "end-date": formatDateString(lastYearEndDate, "query"),
            "ids": ids,
            "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth",
            "metrics": "ga:users",
            "filters": topPagesFilter,
            "sort": "ga:pageTitle,ga:yearMonth"
        }).then(function (results) {
            //map in 0 values for current year data
            allApplicationData.thisYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].thisYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function (dataRow) {
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
        }).then(function () {

            return gaRequester.queryGA({
                "start-date": formatDateString(previousYearStartDate, "query"),
                "end-date": formatDateString(previousYearEndDate, "query"),
                "ids": ids,
                "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth",
                "metrics": "ga:users",
                "filters": topPagesFilter,
                "sort": "ga:pageTitle,ga:nthMonth"
            });
        }).then(function (results) {
            //map in 0 values for previous year data
            allApplicationData.previousYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].previousYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function (dataRow) {
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

        }).catch(function (err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * Retrieve the weekly session data for individual applications and the overall total
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveWeeklySessions() {
    "use strict";

    assert(isDate(startDate), 'retrieveWeeklySeesions assert failed - startDate: ' + startDate);
    assert(isDate(endDate), 'retrieveWeeklySeesions assert failed - endDate: ' + endDate);


    return new Promise(function (resolve, reject) {

        gaRequester.queryGA({
            "start-date": formatDateString(startDate, "query"),
            "end-date": formatDateString(endDate, "query"),
            "ids": ids,
            "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
            "metrics": "ga:avgSessionDuration",
            "filters": topPagesFilter,
            "sort": "ga:pageTitle,ga:date"
        }).then(function (results) {
            //map in 0 values for current week user data
            allApplicationData.currentWeekSessionData = [0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].currentWeekSessionData = [0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function (dataRow) {
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
        }).then(function () {

            return gaRequester.queryGA({
                "start-date": formatDateString(lastWeekStartDate, "query"),
                "end-date": formatDateString(lastWeekEndDate, "query"),
                "ids": ids,
                "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
                "metrics": "ga:avgSessionDuration",
                "filters": topPagesFilter,
                "sort": "ga:pageTitle,ga:date"
            });
        }).then(function (results) {
            //map in 0 values for current week user data
            allApplicationData.lastWeekSessionData = [0, 0, 0, 0, 0, 0, 0];

            for (var appName in applicationData) {
                applicationData[appName].lastWeekSessionData = [0, 0, 0, 0, 0, 0, 0];
            }

            if (results) {
                results.rows.forEach(function (dataRow) {
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
        }).then(function () {
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
        }).then(function (results) {
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
                results.rows.forEach(function (dataRow) {
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
                    applicationData[appName].lastYearSessionData.forEach(function (dayArray, index) {
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

        }).catch(function (err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * Retrieve the yearly browsers data for individual applications and the overall total
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveYearlyBrowsers() {
    "use strict";

    assert(isDate(lastYearStartDate), 'retrieveYearlyBrowsers assert failed - lastYearStartDate: ' + lastYearStartDate);
    assert(isDate(lastYearEndDate), 'retrieveYearlyBrowsers assert failed - lastYearEndDate: ' + lastYearEndDate);


    return new Promise(function (resolve, reject) {

        gaRequester.queryGA({
            "start-date": formatDateString(lastYearStartDate, "query"),
            "end-date": formatDateString(lastYearEndDate, "query"),
            "ids": ids,
            "dimensions": "ga:pageTitle,ga:browser,ga:yearMonth,ga:nthMonth",
            "metrics": "ga:pageviews",
            "filters": topPagesFilter + ";" + topBrowsersFilter,
            "sort": "ga:pageTitle,ga:browser,ga:yearMonth"
        }).then(function (results) {
            //map in 0 values for each browser month combination
            allApplicationData.browserData = {};
            allApplicationData.browserTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            topBrowsersArray.forEach(function (browserName) {
                allApplicationData.browserData[browserName] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            });


            for (var appName in applicationData) {
                applicationData[appName].browserData = {};
                applicationData[appName].browserTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                topBrowsersArray.forEach(function (browserName) {
                    applicationData[appName].browserData[browserName] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                });

            }

            if (results) {
                results.rows.forEach(function (dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = browser
                                            dataRow[2] = yearMonth
                                            dataRow[3] = monthIndex
                                            dataRow[4] = value
                    */
                    //Record value for each application
                    applicationData[dataRow[0]].browserData[dataRow[1]][+dataRow[3]] = +dataRow[4];
                    //Add to browser monthly total value for each application
                    applicationData[dataRow[0]].browserTotals[+dataRow[3]] = applicationData[dataRow[0]].browserTotals[+dataRow[3]] + (+dataRow[4]);

                    //Add value to all application total
                    allApplicationData.browserData[dataRow[1]][+dataRow[3]] = allApplicationData.browserData[dataRow[1]][+dataRow[3]] + (+dataRow[4]);
                    //Add to browser monthly overall total value
                    allApplicationData.browserTotals[+dataRow[3]] = allApplicationData.browserTotals[+dataRow[3]] + (+dataRow[4]);
                });

                //Need to convert raw numbers to percentages - using month totals for overall figures
                topBrowsersArray.forEach(function (browserName) {
                    for (var monthCounter = 0; monthCounter < 12; monthCounter++) {
                        allApplicationData.browserData[browserName][monthCounter] = roundTo2(allApplicationData.browserData[browserName][monthCounter] /
                            allApplicationData.browserTotals[monthCounter] * 100);
                    }
                });

                //Need to convert raw numbers to percentages - using month totals for each application
                for (var appTName in applicationData) {
                    topBrowsersArray.forEach(function (browserName) {
                        for (var monthCounter = 0; monthCounter < 12; monthCounter++) {
                            applicationData[appTName].browserData[browserName][monthCounter] = roundTo2(applicationData[appTName].browserData[browserName][monthCounter] /
                                applicationData[appTName].browserTotals[monthCounter] * 100);
                        }
                    });

                }


            }

            resolve(true);

        }).catch(function (err) {
            console.log(err);
            reject(err);
        });
    });

}

/**
 * Retrieve the bnreakdown between new visitors and the time period between return visits for individual applications and the overall total
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveVisitorReturns() {
    "use strict";

    assert(isDate(previousYearStartDate), 'retrieveVisitorReturns assert failed - lastYearStartDate: ' + previousYearStartDate);
    assert(isDate(lastYearEndDate), 'retrieveVisitorReturns assert failed - lastYearEndDate: ' + lastYearEndDate);


    return new Promise(function (resolve, reject) {
        //The first query breaks down new vs return visitors - only the new visitors are extracted from the results
        gaRequester.queryGA({
            "start-date": formatDateString(previousYearStartDate, "query"),
            "end-date": formatDateString(lastYearEndDate, "query"),
            "ids": ids,
            "dimensions": "ga:pageTitle,ga:userType",
            "metrics": "ga:pageviews",
            "filters": topPagesFilter,
            "sort": "ga:pageTitle,ga:userType"
        }).then(function (results) {
            //map in 0 values for new visitors and totals
            allApplicationData.visitorReturns = {};
            allApplicationData.visitorReturns["New visitors"] = 0;
            allApplicationData.visitorTotal = 0;

            for (var appName in applicationData) {
                applicationData[appName].visitorReturns = {};
                applicationData[appName].visitorReturns["New visitors"] = 0;
                applicationData[appName].visitorTotal = 0;
            }

            if (results) {
                results.rows.forEach(function (dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = userType
                                            dataRow[2] = value
                    */
                    //We only want the new visitors from this data set
                    if (dataRow[1] === "New Visitor") {
                        //Add to value for each application    
                        applicationData[dataRow[0]].visitorReturns["New visitors"] = +dataRow[2];
                        //Add to total value for each application
                        applicationData[dataRow[0]].visitorTotal = applicationData[dataRow[0]].visitorTotal + (+dataRow[2]);

                        //Add value to all application total
                        allApplicationData.visitorReturns["New visitors"] = allApplicationData.visitorReturns["New visitors"] + (+dataRow[2]);
                        //Add to overall total value
                        allApplicationData.visitorTotal = allApplicationData.visitorTotal + (+dataRow[2]);
                    }
                });

            }
            return gaRequester.queryGA({
                "start-date": formatDateString(previousYearStartDate, "query"),
                "end-date": formatDateString(lastYearEndDate, "query"),
                "ids": ids,
                "dimensions": "ga:pageTitle,ga:daysSinceLastSession",
                "metrics": "ga:pageviews",
                "filters": topPagesFilter,
                "sort": "ga:pageTitle,ga:daysSinceLastSession"
            });
        }).then(function (results) {
            //Add return visitor values as 0s
            allApplicationData.visitorReturns["Returned within a day"] = 0;
            allApplicationData.visitorReturns["Returned within a week"] = 0;
            allApplicationData.visitorReturns["Returned within a month"] = 0;
            allApplicationData.visitorReturns["Returned within a year"] = 0;

            for (var appName in applicationData) {
                applicationData[appName].visitorReturns["Returned within a day"] = 0;
                applicationData[appName].visitorReturns["Returned within a week"] = 0;
                applicationData[appName].visitorReturns["Returned within a month"] = 0;
                applicationData[appName].visitorReturns["Returned within a year"] = 0;
            }

            if (results) {
                results.rows.forEach(function (dataRow) {
                    /*Results structure -   dataRow[0] = appName
                                            dataRow[1] = daysSinceLastSession
                                            dataRow[2] = value
                    */

                    //Classify the number and add to the correct category
                    if ((+dataRow[1]) <= 1) {
                        //Add to value for each application    
                        applicationData[dataRow[0]].visitorReturns["Returned within a day"] = applicationData[dataRow[0]].visitorReturns["Returned within a day"] + (+dataRow[2]);
                        //Add value to all application total
                        allApplicationData.visitorReturns["Returned within a day"] = allApplicationData.visitorReturns["Returned within a day"] + (+dataRow[2]);
                    } else if ((+dataRow[1]) > 1 && (+dataRow[1]) <= 7) {
                        //Add to value for each application    
                        applicationData[dataRow[0]].visitorReturns["Returned within a week"] = applicationData[dataRow[0]].visitorReturns["Returned within a week"] + (+dataRow[2]);
                        //Add value to all application total
                        allApplicationData.visitorReturns["Returned within a week"] = allApplicationData.visitorReturns["Returned within a week"] + (+dataRow[2]);
                    } else if ((+dataRow[1]) > 7 && (+dataRow[1]) <= 31) {
                        //Add to value for each application    
                        applicationData[dataRow[0]].visitorReturns["Returned within a month"] = applicationData[dataRow[0]].visitorReturns["Returned within a month"] + (+dataRow[2]);
                        //Add value to all application total
                        allApplicationData.visitorReturns["Returned within a month"] = allApplicationData.visitorReturns["Returned within a month"] + (+dataRow[2]);
                    } else if ((+dataRow[1]) > 31 && (+dataRow[1]) <= 365) {
                        //Add to value for each application    
                        applicationData[dataRow[0]].visitorReturns["Returned within a year"] = applicationData[dataRow[0]].visitorReturns["Returned within a year"] + (+dataRow[2]);
                        //Add value to all application total
                        allApplicationData.visitorReturns["Returned within a year"] = allApplicationData.visitorReturns["Returned within a year"] + (+dataRow[2]);
                    }


                    //Add to total value for each application
                    applicationData[dataRow[0]].visitorTotal = applicationData[dataRow[0]].visitorTotal + (+dataRow[2]);
                    //Add to overall total value
                    allApplicationData.visitorTotal = allApplicationData.visitorTotal + (+dataRow[2]);

                });

            }


            /*Need to convert values required for horizontal /  stacked chart
                 data: [
                        ["Within a month: 38680 (30%)", 38680],
                            ["Within a day: 38180 (30%)", 38180],
                            ["Within a week: 33197 (26%)", 33197],
                            ["Within a year: 17290 (14%)", 17290]
                        ]
             */
            allApplicationData.visitorReturns.data = [];
            allApplicationData.visitorReturns.data.push([]);
            allApplicationData.visitorReturns.data[0].push("New visitors");
            allApplicationData.visitorReturns.data[0].push(allApplicationData.visitorReturns["New visitors"]);

            allApplicationData.visitorReturns.data.push([]);
            allApplicationData.visitorReturns.data[1].push("Returned within a day");
            allApplicationData.visitorReturns.data[1].push(allApplicationData.visitorReturns["Returned within a day"]);


            allApplicationData.visitorReturns.data.push([]);
            allApplicationData.visitorReturns.data[2].push("Returned within a week");
            allApplicationData.visitorReturns.data[2].push(allApplicationData.visitorReturns["Returned within a week"]);

            allApplicationData.visitorReturns.data.push([]);
            allApplicationData.visitorReturns.data[3].push("Returned within a month");
            allApplicationData.visitorReturns.data[3].push(allApplicationData.visitorReturns["Returned within a month"]);


            allApplicationData.visitorReturns.data.push([]);
            allApplicationData.visitorReturns.data[4].push("Returned within a year");
            allApplicationData.visitorReturns.data[4].push(allApplicationData.visitorReturns["Returned within a year"]);


            //Sort array into descending order
            sortNumericalArrayDesc(allApplicationData.visitorReturns.data, 1);

            //Set-up the series labels
            allApplicationData.visitorReturns.labels = [];

            allApplicationData.visitorReturns.data.forEach(function (dataRow) {
                allApplicationData.visitorReturns.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
                    Math.round(dataRow[1] / allApplicationData.visitorTotal * 100) + ")");
            });


            for (var appTName in applicationData) {

                applicationData[appTName].visitorReturns.data = [];
                applicationData[appTName].visitorReturns.data.push([]);
                applicationData[appTName].visitorReturns.data[0].push("New visitors");
                applicationData[appTName].visitorReturns.data[0].push(applicationData[appTName].visitorReturns["New visitors"]);

                applicationData[appTName].visitorReturns.data.push([]);
                applicationData[appTName].visitorReturns.data[1].push("Returned within a day");
                applicationData[appTName].visitorReturns.data[1].push(applicationData[appTName].visitorReturns["Returned within a day"]);

                applicationData[appTName].visitorReturns.data.push([]);
                applicationData[appTName].visitorReturns.data[2].push("Returned within a week");
                applicationData[appTName].visitorReturns.data[2].push(applicationData[appTName].visitorReturns["Returned within a week"]);

                applicationData[appTName].visitorReturns.data.push([]);
                applicationData[appTName].visitorReturns.data[3].push("Returned within a month");
                applicationData[appTName].visitorReturns.data[3].push(applicationData[appTName].visitorReturns["Returned within a month"]);

                applicationData[appTName].visitorReturns.data.push([]);
                applicationData[appTName].visitorReturns.data[4].push("Returned within a year");
                applicationData[appTName].visitorReturns.data[4].push(applicationData[appTName].visitorReturns["Returned within a year"]);


                //Sort array into descending order
                sortNumericalArrayDesc(applicationData[appTName].visitorReturns.data, 1);
                //Set-up the series labels
                applicationData[appTName].visitorReturns.labels = [];

                applicationData[appTName].visitorReturns.data.forEach(function (dataRow) {
                    applicationData[appTName].visitorReturns.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
                        Math.round(dataRow[1] / applicationData[appTName].visitorTotal * 100) + ")");
                });



            }

            resolve(true);

        }).catch(function (err) {
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

    numericalArray.sort(function (a, b) {
        return a - b;
    });

}

/**
 * Sorts a numerical array into descending order.
 * @param {array} numericalArray - an array of numbers or an array of arrays containing numbers
 * @param {number} arrayIndex - for an array of arrays, specifies the index within the sub-array to use for the comparison
 * @return {mericalArray} the sorted array
 */
function sortNumericalArrayDesc(numericalArray, arrayIndex) {
    "use strict";

    assert(Array.isArray(numericalArray), 'sortNumericalArrayDesc assert failed - numericalArray: ' + numericalArray);
    assert((typeof arrayIndex === "undefined" || typeof arrayIndex === "number"), 'sortNumericalArrayDesc assert failed - arrayIndex: ' + arrayIndex);

    if (typeof arrayIndex === "undefined") {
        numericalArray.sort(function (a, b) {
            return b - a;
        });
    } else {
        numericalArray.sort(function (a, b) {
            return b[arrayIndex] - a[arrayIndex];
        });
    }

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
