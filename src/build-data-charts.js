/*global window, document, topPagesFilter, topBrowsersFilter, startDate, endDate, ids, lastWeekStartDate, lastWeekEndDate,  lastYearStartDate, lastYearEndDate */
/*global currentWeekdayLabels, last12MonthsLabels,  YearlyDataLabels, allApplicationData, applicationData, APP_NAMES */
/*global Masonry, formatDateString, C3StatsChart, assert */


//The element suffixes which are used to differentiate elements for the same data type
var ELEMENT_NAMES = ["lassi", "lassi-spear", "smes", "smes-edit", "vicnames", "landata-tpi", "landata-vmt"];


//Holds the indidivudal chart references
var chartRefs = [];
//Variable for masonry layout
var msnry;
//Variable to hold the parent element for all chart cards
var parentElement;


/* 
    Set-up the buttons for transforming charts, opening new sections and call the masonry set-up for chart cards
*/
window.onload = function() {
    "use strict";

    parentElement = document.getElementById("masonry-grid");

    createMasonry();

};


/* 
    Set-up the masonry options
*/
function createMasonry() {
    "use strict";

    msnry = new Masonry(parentElement, {
        // options
        "itemSelector": ".card",
        "columnWidth": ".grid-sizer" //,
            //"gutter": 5 //,
            //"percentPosition": true
    });

    //Refresh charts after layout is complete
    msnry.on('layoutComplete', function(items) {
        refreshCharts();
    });
}

/* 
    Work through all charts and refresh them
*/
function refreshCharts() {
    "use strict";

    chartRefs.forEach(function(chartRef) {
        chartRef.chart.flush();
    });

}

/**
 * Checks if an element with the specified Id exists in the DOM.  If not, a new div element is created.  If a button Id and button function are specified, will also 
 *    add an event listener to the button.
 * @param {node} parentElement -  the parent parentElement to create the new element under
 * @param {string} elementId - the id for the element
 * @param {string} elementClassString - the class(es) to be applied to the element
 * @param {string} elementHTML - the HTML for the element
 * @param {string} buttonId - Optional id of the button to add an event listener for
 * @param {string} transformFunctionType - if a button has been specified, the type of transform to run
 * @param {number} chartRef - the reference number for the chart object
 */
function createElement(elementId, elementClassString, elementHTML, buttonId, transformFunctionType, chartRef) {
    "use strict";

    assert(typeof elementId !== "undefined", 'createElement assert failed - elementId: ' + elementId);
    assert(typeof elementHTML !== "undefined", 'createElement assert failed - elementHTML: ' + elementHTML);
    //Check that a buttoinId and function have been supplied together or not at all
    assert((typeof buttonId !== "undefined" && typeof transformFunctionType !== "undefined" && typeof chartRef === "number") ||
        (typeof buttonId === "undefined" && typeof transformFunctionType === "undefined" && typeof chartRef === "undefined"),
        'createElement assert failed - button parameters: ' + buttonId + ', ' + transformFunctionType + ', ' + chartRef);


    if (document.getElementById(elementId) === null) {
        var newDiv = document.createElement('div');

        newDiv.id = elementId;
        newDiv.className = elementClassString;
        newDiv.innerHTML = elementHTML;

        parentElement.appendChild(newDiv);

        //Tell masonry that the item has been added
        msnry.appended(newDiv);

        //Add a button event listener if required
        if (typeof buttonId !== "undefined") {
            //Use type of transformation to define button click event
            if (transformFunctionType === "transformArea") {
                document.getElementById(buttonId).addEventListener("click", function() {
                    transformArea(chartRef);
                }, false);
            } else if (transformFunctionType === "transformHorizontalStackedGrouped") {
                document.getElementById(buttonId).addEventListener("click", function() {
                    transformHorizontalStackedGrouped(chartRef);
                }, false);
            } else if (transformFunctionType === "transformVerticalStackedGrouped") {
                document.getElementById(buttonId).addEventListener("click", function() {
                    transformVerticalStackedGrouped(chartRef);
                }, false);

            }

        }

    }


}


/* 
    Build all weekly user charts - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
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

    //Create the DOM element (if it doesn't exist already)
    createElement('weekly-users-overall-card',
        'card full-width home overall',
        '<div id="weekly-users-overall"></div><button id="weekly-users-overall-button">Change overall weekly users chart</button>',
        'weekly-users-overall-button',
        "transformArea", 0);

    chartRefs[0] = new C3StatsChart(columnData, "weekly-users-overall");
    chartRefs[0].createWeekDayAreaChart();

    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
        lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
        lastYearArray = ["Median for the last year"];
        columnData = [];
        var nextChartRef = chartRefs.length;

        Array.prototype.push.apply(currentWeekArray, applicationData[APP_NAMES[appCounter]].currentWeekUserData);
        Array.prototype.push.apply(lastWeekArray, applicationData[APP_NAMES[appCounter]].lastWeekUserData);
        Array.prototype.push.apply(lastYearArray, applicationData[APP_NAMES[appCounter]].lastYearMedianUserData);


        columnData.push(currentWeekdayLabels);
        columnData.push(lastYearArray);
        columnData.push(lastWeekArray);
        columnData.push(currentWeekArray);

        //Create the DOM element (if it doesn't exist already)
        createElement('weekly-users-' + ELEMENT_NAMES[appCounter] + '-card',
            'card home ' + ELEMENT_NAMES[appCounter],
            '<div id="weekly-users-' + ELEMENT_NAMES[appCounter] + '"></div><button id="weekly-users-' + ELEMENT_NAMES[appCounter] + '-button">Change ' +
            ELEMENT_NAMES[appCounter] + ' weekly users chart</button>',
            'weekly-users-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformArea", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, "weekly-users-" + ELEMENT_NAMES[appCounter]);
        chartRefs[nextChartRef].createWeekDayAreaChart();
    }

    msnry.layout();


}

/* 
    Build all yearly charts - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the daya already being present within:
        allApplicationData.thisYearUserData
        allApplicationData.previousYearUserData
        
        For each app:
        applicationData[appName].thisYearUserData
        applicationData[appName].previousYearUserData
*/
function buildYearlyUsersCharts() {
    "use strict";

    var currentYearArray, previousYearArray;
    var columnData = [];
    var nextChartORef = chartRefs.length;

    //Set-up overall chart
    previousYearArray = ["Previous year"];
    currentYearArray = ["Current year"];

    Array.prototype.push.apply(previousYearArray, allApplicationData.previousYearUserData);
    Array.prototype.push.apply(currentYearArray, allApplicationData.thisYearUserData);

    columnData.push(previousYearArray);
    columnData.push(currentYearArray);

    //Create the DOM element (if it doesn't exist already)
    createElement('yearly-users-overall-card',
        'card full-width overall',
        '<div id="yearly-users-overall"></div>');

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-users-overall", last12MonthsLabels);
    chartRefs[nextChartORef].createStaticVerticalTwoSeriesBarChart();


    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        previousYearArray = ["Previous year"];
        currentYearArray = ["Current year"];
        columnData = [];
        var nextChartRef = chartRefs.length;

        Array.prototype.push.apply(previousYearArray, applicationData[APP_NAMES[appCounter]].previousYearUserData);
        Array.prototype.push.apply(currentYearArray, applicationData[APP_NAMES[appCounter]].thisYearUserData);

        columnData.push(previousYearArray);
        columnData.push(currentYearArray);

        //Create the DOM element (if it doesn't exist already)
        createElement('yearly-users-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="yearly-users-' + ELEMENT_NAMES[appCounter] + '"></div>');


        chartRefs[nextChartRef] = new C3StatsChart(columnData, "yearly-users-" + ELEMENT_NAMES[appCounter], last12MonthsLabels);
        chartRefs[nextChartRef].createStaticVerticalTwoSeriesBarChart();
    }


    msnry.layout();
}

/* 
    Build all weekly session dration charts - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the daya already being present within:
        allApplicationData.currentWeekUserData
        allApplicationData.lastWeekUserData
        allApplicationData.lastYearMedianUserData
        
        For each app:
        applicationData[appName].currentWeekUserData
        applicationData[appName].lastWeekUserData
        applicationData[appName].lastYearMedianUserData
*/
function buildWeeklySessionCharts() {
    "use strict";

    var currentWeekArray, lastWeekArray, lastYearArray;
    var columnData = [];
    var nextChartORef = chartRefs.length;

    //Set-up overall chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, allApplicationData.currentWeekSessionData);
    Array.prototype.push.apply(lastWeekArray, allApplicationData.lastWeekSessionData);
    Array.prototype.push.apply(lastYearArray, allApplicationData.lastYearMedianSessionData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);

    //Create the DOM element (if it doesn't exist already)
    createElement('weekly-sessions-overall-card',
        'card full-width home overall',
        '<div id="weekly-sessions-overall"></div><button id="weekly-sessions-overall-button">Change overall weekly sessions chart</button>',
        'weekly-sessions-overall-button',
        "transformArea", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-sessions-overall");
    chartRefs[nextChartORef].createWeekDayAreaChart();

    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
        lastWeekArray = ["Week starting" + formatDateString(lastWeekStartDate, "display")];
        lastYearArray = ["Median for the last year"];
        columnData = [];
        var nextChartRef = chartRefs.length;

        Array.prototype.push.apply(currentWeekArray, applicationData[APP_NAMES[appCounter]].currentWeekSessionData);
        Array.prototype.push.apply(lastWeekArray, applicationData[APP_NAMES[appCounter]].lastWeekSessionData);
        Array.prototype.push.apply(lastYearArray, applicationData[APP_NAMES[appCounter]].lastYearMedianSessionData);


        columnData.push(currentWeekdayLabels);
        columnData.push(lastYearArray);
        columnData.push(lastWeekArray);
        columnData.push(currentWeekArray);

        //Create the DOM element (if it doesn't exist already)
        createElement('weekly-sessions-' + ELEMENT_NAMES[appCounter] + '-card',
            'card home ' + ELEMENT_NAMES[appCounter],
            '<div id="weekly-sessions-' + ELEMENT_NAMES[appCounter] + '"></div><button id="weekly-sessions-' + ELEMENT_NAMES[appCounter] + '-button">Change ' +
            ELEMENT_NAMES[appCounter] + ' weekly sessions chart</button>',
            'weekly-sessions-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformArea", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, "weekly-sessions-" + ELEMENT_NAMES[appCounter]);
        chartRefs[nextChartRef].createWeekDayAreaChart();
    }

    msnry.layout();


}


function transformArea(chartRefNum) {
    "use strict";

    chartRefs[chartRefNum].transformAreaBar();
}

function transformHorizontalStackedGrouped(chartRefNum) {
    "use strict";

    chartRefs[chartRefNum].transformHorizontalStackedGrouped();

}


function transformVerticalStackedGrouped(chartRefNum) {
    "use strict";

    chartRefs[chartRefNum].transformVerticalStackedGrouped();

}