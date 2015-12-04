/*global window, document, topPagesFilter, topBrowsersFilter, startDate, endDate, ids, lastWeekStartDate, lastWeekEndDate,  lastYearStartDate, lastYearEndDate */
/*global currentWeekdayLabels, Last12MonthsLabels,  YearlyDataLabels, allApplicationData, applicationData */
/*global Masonry, formatDateString, C3StatsChart */

var chartRefs = [];
var msnry;

/* 
    Set-up the buttons for transforming charts, opening new sections and call the masonry set-up for chart cards
*/
window.onload = function () {
    "use strict";

    document.querySelector("[id=weekly-users-overall-button]").addEventListener("click", function () {
        transformAreaChart(0);
    }, false);

    document.querySelector("[id=weekly-users-lassi-button]").addEventListener("click", function () {
        transformAreaChart(1);
    }, false);
    document.querySelector("[id=weekly-users-spear-button]").addEventListener("click", function () {
        transformAreaChart(2);
    }, false);
    document.querySelector("[id=weekly-users-smes-button]").addEventListener("click", function () {
        transformAreaChart(3);
    }, false);
    document.querySelector("[id=weekly-users-smes-edit-button]").addEventListener("click", function () {
        transformAreaChart(4);
    }, false);
    document.querySelector("[id=weekly-users-vicnames-button]").addEventListener("click", function () {
        transformAreaChart(5);
    }, false);
    document.querySelector("[id=weekly-users-landata-tpi-button]").addEventListener("click", function () {
        transformAreaChart(6);
    }, false);
    document.querySelector("[id=weekly-users-landata-vmt-button]").addEventListener("click", function () {
        transformAreaChart(7);
    }, false);


    createMasonry();
};


/* 
    Set-up the masonry options
*/
function createMasonry() {
    "use strict";

    var elem = document.querySelector('.masonry-layout');

    msnry = new Masonry(elem, {
        // options
        "itemSelector": ".card",
        "columnWidth": ".card",
        "gutter": 10,
        "percentPosition": true
    });
}

/* 
    Work through all charts and refresh them
*/
function refreshCharts() {
    "use strict";

    chartRefs.forEach(function (chartRef) {
        chartRef.chart.flush();
    });

}

/* 
    Build all weekly charts - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the daya already being present within:
        allApplicationData.currentWeekUserData
        allApplicationData.lastWeekUserData
        allApplicationData.lastYearMedianUserData
        
        For each app:
        applicationData[appName].currentWeekUserData
        applicationData[appName].lastWeekUserData
        applicationData[appName].lastYearMedianUserData
*/
function buildWeeklyUsersCharts() {
    "use strict";

    var currentWeekArray, lastWeekArray, lastYearArray;
    var columnData = [];

    //Set-up overall chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, allApplicationData.currentWeekUserData);
    Array.prototype.push.apply(lastWeekArray, allApplicationData.lastWeekUserData);
    Array.prototype.push.apply(lastYearArray, allApplicationData.lastYearMedianUserData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);


    chartRefs[0] = new C3StatsChart(columnData, "weekly-users-overall");
    chartRefs[0].createWeekDayAreaChart();


    //Set-up lassi chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, applicationData["LASSI - Land and Survey Spatial Information"].currentWeekUserData);
    Array.prototype.push.apply(lastWeekArray, applicationData["LASSI - Land and Survey Spatial Information"].lastWeekUserData);
    Array.prototype.push.apply(lastYearArray, applicationData["LASSI - Land and Survey Spatial Information"].lastYearMedianUserData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);


    chartRefs[1] = new C3StatsChart(columnData, "weekly-users-lassi");
    chartRefs[1].createWeekDayAreaChart();


    //Set-up lassi-spear chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, applicationData["LASSI - SPEAR"].currentWeekUserData);
    Array.prototype.push.apply(lastWeekArray, applicationData["LASSI - SPEAR"].lastWeekUserData);
    Array.prototype.push.apply(lastYearArray, applicationData["LASSI - SPEAR"].lastYearMedianUserData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);


    chartRefs[2] = new C3StatsChart(columnData, "weekly-users-spear");
    chartRefs[2].createWeekDayAreaChart();



    //Set-up smes chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, applicationData["SMES - Survey Marks Enquiry Service"].currentWeekUserData);
    Array.prototype.push.apply(lastWeekArray, applicationData["SMES - Survey Marks Enquiry Service"].lastWeekUserData);
    Array.prototype.push.apply(lastYearArray, applicationData["SMES - Survey Marks Enquiry Service"].lastYearMedianUserData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);


    chartRefs[3] = new C3StatsChart(columnData, "weekly-users-smes");
    chartRefs[3].createWeekDayAreaChart();



    //Set-up smes edit chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, applicationData["SMES Edit - Survey Marks Enquiry Service"].currentWeekUserData);
    Array.prototype.push.apply(lastWeekArray, applicationData["SMES Edit - Survey Marks Enquiry Service"].lastWeekUserData);
    Array.prototype.push.apply(lastYearArray, applicationData["SMES Edit - Survey Marks Enquiry Service"].lastYearMedianUserData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);


    chartRefs[4] = new C3StatsChart(columnData, "weekly-users-smes-edit");
    chartRefs[4].createWeekDayAreaChart();



    //Set-up vicnames chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, applicationData["VICNAMES - The Register of Geographic Names"].currentWeekUserData);
    Array.prototype.push.apply(lastWeekArray, applicationData["VICNAMES - The Register of Geographic Names"].lastWeekUserData);
    Array.prototype.push.apply(lastYearArray, applicationData["VICNAMES - The Register of Geographic Names"].lastYearMedianUserData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);


    chartRefs[5] = new C3StatsChart(columnData, "weekly-users-vicnames");
    chartRefs[5].createWeekDayAreaChart();


    //Set-up landata tpi chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, applicationData["LASSI - TPC"].currentWeekUserData);
    Array.prototype.push.apply(lastWeekArray, applicationData["LASSI - TPC"].lastWeekUserData);
    Array.prototype.push.apply(lastYearArray, applicationData["LASSI - TPC"].lastYearMedianUserData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);


    chartRefs[6] = new C3StatsChart(columnData, "weekly-users-landata-tpi");
    chartRefs[6].createWeekDayAreaChart();


    //Set-up landata vmt chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, applicationData["LASSI - VMT"].currentWeekUserData);
    Array.prototype.push.apply(lastWeekArray, applicationData["LASSI - VMT"].lastWeekUserData);
    Array.prototype.push.apply(lastYearArray, applicationData["LASSI - VMT"].lastYearMedianUserData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);


    chartRefs[7] = new C3StatsChart(columnData, "weekly-users-landata-vmt");
    chartRefs[7].createWeekDayAreaChart();


    msnry.layout();

}

function transformAreaChart(chartRefNum) {
    chartRefs[chartRefNum].transformAreaBar();
}
