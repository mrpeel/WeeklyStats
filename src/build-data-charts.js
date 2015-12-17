/*global window, document, Promise, console, topPagesFilter, topBrowsersFilter, startDate, endDate, ids, lastWeekStartDate, lastWeekEndDate  */
/*global lastYearStartDate, lastYearEndDate, currentWeekdayLabels, last12MonthsLabels,  YearlyDataLabels, allApplicationData, applicationData */
/*global APP_NAMES, APP_LABELS, topBrowsersArray, Masonry, formatDateString, C3StatsChart, assert */


//The element suffixes which are used to differentiate elements for the same data type
var ELEMENT_NAMES = ["lassi", "lassi-spear", "smes", "vicnames", "landata-tpi", "landata-vmt"];


//Holds the indidivudal chart references
var chartRefs = [];
//Variable for masonry layout
var msnry;
//Variable to hold the parent element for all chart cards
var parentElement;


/* 
    Set-up the buttons for transforming charts, opening new sections and call the masonry set-up for chart cards
*/
window.onload = function () {
    "use strict";

    parentElement = document.getElementById("masonry-grid");
    createMasonry();

    //Add button listeners
    document.getElementById("show-home").addEventListener("click", showHomeScreen, false);
    document.getElementById("show-overall").addEventListener("click", showOverallScreen, false);
    document.getElementById("show-lassi").addEventListener("click", showLASSIScreen, false);
    document.getElementById("show-lassi-spear").addEventListener("click", showLASSISPEARScreen, false);
    document.getElementById("show-smes").addEventListener("click", showSMESScreen, false);
    document.getElementById("show-vicnames").addEventListener("click", showVICNAMESScreen, false);
    document.getElementById("show-landata-tpi").addEventListener("click", showLANDATATPIScreen, false);
    document.getElementById("show-landata-vmt").addEventListener("click", showLANDATAVMTScreen, false);

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
    msnry.on('layoutComplete', function (items) {
        refreshCharts();
    });
}

/* 
    Work through all charts and refresh them
*/
function refreshCharts() {
    "use strict";

    window.setTimeout(function () {
        chartRefs.forEach(function (chartRef) {
            chartRef.chart.flush();
        });
    }, 0);

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
                document.getElementById(buttonId).addEventListener("click", function () {
                    transformArea(chartRef);
                }, false);
            } else if (transformFunctionType === "transformHorizontalStackedGrouped") {
                document.getElementById(buttonId).addEventListener("click", function () {
                    transformHorizontalStackedGrouped(chartRef);
                }, false);
            } else if (transformFunctionType === "transformVerticalStackedGrouped") {
                document.getElementById(buttonId).addEventListener("click", function () {
                    transformVerticalStackedGrouped(chartRef);
                }, false);

            }

        }

    }


}

function clearChartsFromScreen() {
    //Clear the chart references
    chartRefs.length = 0;

    //Remove the items from masonry and the DOM
    while (parentElement.firstChild) {
        //Check if masonry object has been created - if so, remove the element from it
        if (typeof msnry !== "undefined") {
            msnry.remove(parentElement.firstChild);
        }

        parentElement.removeChild(parentElement.firstChild);
    }

    var sizerDiv = document.createElement('div');

    sizerDiv.className = "grid-sizer";
    parentElement.appendChild(sizerDiv);

    if (typeof msnry !== "undefined") {
        msnry.layout();
    }

}

/*
 * Builds the charts for the home screen - the page breakdown and page visits for each app
 */
function showHomeScreen() {

    clearChartsFromScreen();
    buildWeeklyUsersCharts();
}

/*
 * Builds the charts for the overall screen - the page breakdown and page visits for each app
 */
function showOverallScreen() {

    clearChartsFromScreen();
    buildOverallCharts();
}

/*
 * Builds the charts for the LASSI screen - the page breakdown and page visits for each app
 */
function showLASSIScreen() {

    clearChartsFromScreen();
    buildWeeklyUsersCharts();
}

/*
 * Builds the charts for the LASSI-SPEAR screen - the page breakdown and page visits for each app
 */
function showLASSISPEARScreen() {

    clearChartsFromScreen();
    buildWeeklyUsersCharts();
}

/*
 * Builds the charts for the SMES screen - the page breakdown and page visits for each app
 */
function showSMESScreen() {

    clearChartsFromScreen();
    buildWeeklyUsersCharts();
}


/*
 * Builds the charts for the VICNAMES screen - the page breakdown and page visits for each app
 */
function showVICNAMESScreen() {

    clearChartsFromScreen();
    buildWeeklyUsersCharts();
}


/*
 * Builds the charts for the LANDATA - TPI screen - the page breakdown and page visits for each app
 */
function showLANDATATPIScreen() {

    clearChartsFromScreen();
    buildWeeklyUsersCharts();
}


/*
 * Builds the charts for the LANDATA - VMT screen - the page breakdown and page visits for each app
 */
function showLANDATAVMTScreen() {

    clearChartsFromScreen();
    buildWeeklyUsersCharts();
}



function buildYearlyPagesChart() {
    "use strict";

    var seriesArray = [];
    var columnData = [];


    msnry.layout();


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
    var nextChartORef = chartRefs.length;

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

    //Create the DOM element 
    createElement('weekly-users-overall-card',
        'card full-width home overall',
        '<div id="weekly-users-overall"></div><button id="weekly-users-overall-button">Change overall weekly users chart</button>',
        'weekly-users-overall-button',
        "transformArea", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-users-overall");
    chartRefs[nextChartORef].createWeekDayAreaChart();



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

        //Create the DOM element 
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
    Build all overall charts.  Generates all the overall charts.
  
*/
function buildOverallCharts() {
    "use strict";

    var yearPageData, currentWeekArray, lastWeekArray, lastYearArray, previousYearArray, currentYearArray, dataLabels, seriesLabels;
    var columnData, nextChartORef;
    var cardClasses = "card half-width overall";

    /* 
    Build the yearly page breakdown chart.  Relies on the daya already being present within:
        allApplicationData.pageData
        
    */
    columnData = [];
    nextChartORef = chartRefs.length;
    yearPageData = {};
    Object.assign(yearPageData, allApplicationData.pageData);

    //Map in values for each page month combination to the series then add to the columnData
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Add in the application label as the data set name
        yearPageData[APP_NAMES[appCounter]].unshift(APP_LABELS[appCounter]);
        //add data set to chart column data
        columnData.push(yearPageData[APP_NAMES[appCounter]]);
    }


    //Create the DOM element 
    createElement('yearly-pages-overall-card',
        cardClasses,
        '<div id="yearly-pages-overall"></div><button id="yearly-pages-overall-button">Change overall yearly pages chart</button>',
        'yearly-pages-overall-button',
        "transformVerticalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, 'yearly-pages-overall', last12MonthsLabels, APP_LABELS);
    chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of visits");


    /* Build weekly user charts.  Relies on the daya already being present within:
        allApplicationData.currentWeekUserData
        allApplicationData.lastWeekUserData
        allApplicationData.lastYearMedianUserData
    */

    //Set-up overall chart
    columnData = [];
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting " + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];
    nextChartORef = chartRefs.length;

    Array.prototype.push.apply(currentWeekArray, allApplicationData.currentWeekUserData);
    Array.prototype.push.apply(lastWeekArray, allApplicationData.lastWeekUserData);
    Array.prototype.push.apply(lastYearArray, allApplicationData.lastYearMedianUserData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);

    //Create the DOM element 
    createElement('weekly-users-overall-card',
        cardClasses,
        '<div id="weekly-users-overall"></div><button id="weekly-users-overall-button">Change overall weekly users chart</button>',
        'weekly-users-overall-button',
        "transformArea", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-users-overall");
    chartRefs[nextChartORef].createWeekDayAreaChart();


    /* Build current / previous year charts.  Relies on the daya already being present within:
        allApplicationData.thisYearUserData
        allApplicationData.previousYearUserData
    */
    columnData = [];
    previousYearArray = ["Previous year"];
    currentYearArray = ["Current year"];
    nextChartORef = chartRefs.length;

    Array.prototype.push.apply(previousYearArray, allApplicationData.previousYearUserData);
    Array.prototype.push.apply(currentYearArray, allApplicationData.thisYearUserData);

    columnData.push(previousYearArray);
    columnData.push(currentYearArray);

    //Create the DOM element 
    createElement('yearly-users-overall-card',
        cardClasses,
        '<div id="yearly-users-overall"></div>');

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-users-overall", last12MonthsLabels);
    chartRefs[nextChartORef].createStaticVerticalTwoSeriesBarChart();




    /* Build weekly session duration chart.  Relies on the daya already being present within:
        allApplicationData.currentWeekSessionData
        allApplicationData.lastWeekSessionData
        allApplicationData.lastYearMedianSessionData
    */
    columnData = [];
    nextChartORef = chartRefs.length;

    //Set-up overall chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting " + formatDateString(lastWeekStartDate, "display")];
    lastYearArray = ["Median for the last year"];

    Array.prototype.push.apply(currentWeekArray, allApplicationData.currentWeekSessionData);
    Array.prototype.push.apply(lastWeekArray, allApplicationData.lastWeekSessionData);
    Array.prototype.push.apply(lastYearArray, allApplicationData.lastYearMedianSessionData);

    columnData.push(currentWeekdayLabels);
    columnData.push(lastYearArray);
    columnData.push(lastWeekArray);
    columnData.push(currentWeekArray);

    //Create the DOM element 
    createElement('weekly-sessions-overall-card',
        cardClasses,
        '<div id="weekly-sessions-overall"></div><button id="weekly-sessions-overall-button">Change overall weekly sessions chart</button>',
        'weekly-sessions-overall-button',
        "transformArea", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-sessions-overall");
    chartRefs[nextChartORef].createWeekDayAreaChart();

    /* 
      Build visitor return chart.  Relies on the daya already being present within:
          allApplicationData.visitorReturns.data
      */
    columnData = allApplicationData.visitorReturns.data.slice();
    dataLabels = allApplicationData.visitorReturns.labels.slice();
    seriesLabels = [];
    nextChartORef = chartRefs.length;

    //The first entry in the row contains the label used for the data
    allApplicationData.visitorReturns.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('visitor-return-overall-card',
        cardClasses,
        '<div id="visitor-return-overall"></div><button id="visitor-return-overall-button">Change overall visitor return chart</button>',
        'visitor-return-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "visitor-return-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Time to return");

    /* 
    Build  yearly browser usage charts.  Relies on the daya already being present within:
        allApplicationData.browserData[browserName]
        
    */
    columnData = [];
    nextChartORef = chartRefs.length;

    //Map in values for each browser month combination to the series then add to the columnData
    topBrowsersArray.forEach(function (browserName) {
        allApplicationData.browserData[browserName].unshift(browserName);
        columnData.push(allApplicationData.browserData[browserName]);
    });


    //Create the DOM element 
    createElement('yearly-browsers-overall-card',
        cardClasses,
        '<div id="yearly-browsers-overall"></div><button id="yearly-browsers-overall-button">Change overall yearly browsers chart</button>',
        'yearly-browsers-overall-button',
        "transformVerticalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-browsers-overall", last12MonthsLabels, topBrowsersArray);
    chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of visits");

    /* 
           Build weekly horizontal bar graphs for map types.  Relies on the data already being present within:
               allApplicationData.weekMapTypes.data
               allApplicationData.weekMapTypes.labels
               
       */

    columnData = allApplicationData.weekMapTypes.data.slice();
    dataLabels = allApplicationData.weekMapTypes.labels.slice();
    seriesLabels = [];
    nextChartORef = chartRefs.length;


    //The first entry in the row contains the label used for the data
    allApplicationData.weekMapTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('weekly-maps-overall-card',
        cardClasses,
        '<div id="weekly-maps-overall"></div><button id="weekly-maps-overall-button">Change overall weekly map types chart</button>',
        'weekly-maps-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-maps-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Map type");


    /* 
    Build yearly vertical stacked bar graphs of map types.  Relies on the data already being present within:
        allApplicationData.yearSearchTypes.data        
        
        last12MonthsLabels
*/
    columnData = allApplicationData.yearMapTypes.data.slice();
    seriesLabels = [];
    nextChartORef = chartRefs.length;

    //The first entry in the row contains the label used for the data
    allApplicationData.yearMapTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('yearly-maps-overall-card',
        cardClasses,
        '<div id="yearly-maps-overall"></div><button id="yearly-maps-overall-button">Change overall yearly map types chart</button>',
        'yearly-maps-overall-button',
        "transformVerticalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-maps-overall", last12MonthsLabels, seriesLabels);
    chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of map types");



    /* 
    Build weekly horizontal bar graphs of search types with absolute numbers.  Relies on the data already being present within:
        allApplicationData.weekSearchTypes.data
        allApplicationData.weekSearchTypes.labels
        
*/
    columnData = allApplicationData.weekSearchTypes.data.slice();
    dataLabels = allApplicationData.weekSearchTypes.labels.slice();
    seriesLabels = [];
    nextChartORef = chartRefs.length;


    //The first entry in the row contains the label used for the data
    allApplicationData.weekSearchTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('weekly-search-overall-card',
        cardClasses + " raw",
        '<div id="weekly-search-overall"></div><button id="weekly-search-overall-button">Change overall weekly search chart</button>',
        'weekly-search-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);


    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-search-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Search type");


    /* 
    Build weekly horizontal bar graphs of search types per visit.  Relies on the data already being present within:
        allApplicationData.weekSearchTypes.dataPerVisit
        allApplicationData.weekSearchTypes.labelsPerVisit
        
*/
    columnData = allApplicationData.weekSearchTypes.dataPerVisit.slice();
    dataLabels = allApplicationData.weekSearchTypes.labelsPerVisit.slice();
    seriesLabels = [];
    nextChartORef = chartRefs.length;


    //The first entry in the row contains the label used for the data
    allApplicationData.weekSearchTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('weekly-search-per-overall-card',
        cardClasses + " per-visit hidden",
        '<div id="weekly-search-per-overall"></div><button id="weekly-search-per-overall-button">Change overall weekly search chart</button>',
        'weekly-search-per-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-search-per-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Search type");


    /* 
    Build yearly vertical stacked bar graphs of search types.  Relies on the data already being present within:
        allApplicationData.yearSearchTypes.data
                
        last12MonthsLabels
        
        */
    columnData = allApplicationData.yearSearchTypes.data.slice();
    nextChartORef = chartRefs.length;
    seriesLabels = [];

    //The first entry in the row contains the label used for the data
    allApplicationData.yearSearchTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('yearly-search-overall-card',
        cardClasses,
        '<div id="yearly-search-overall"></div><button id="yearly-search-overall-button">Change overall yearly search chart</button>',
        'yearly-search-overall-button',
        "transformVerticalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-search-overall", last12MonthsLabels, seriesLabels);
    chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of searches");


    /* 
    Build weekly horizontal bar graphs of activity types with absolute numbers.  Relies on the data already being present within:
        allApplicationData.weekActivityTypes.data
        allApplicationData.weekActivityTypes.labels
*/
    columnData = allApplicationData.weekActivityTypes.data.slice();
    dataLabels = allApplicationData.weekActivityTypes.labels.slice();
    seriesLabels = [];

    nextChartORef = chartRefs.length;


    //The first entry in the row contains the label used for the data
    allApplicationData.weekActivityTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('weekly-activity-types-overall-card',
        cardClasses + " raw",
        '<div id="weekly-activity-types-overall"></div><button id="weekly-activity-types-overall-button">Change overall weekly activity types chart</button>',
        'weekly-activity-types-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activity-types-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Activity type");


    /* 
        Build weekly horizontal bar graphs of activities per visit.  Relies on the data already being present within:
            allApplicationData.weekActivityTypes.dataPerVisit
            allApplicationData.weekActivityTypes.labelsPerVisit
            
    */
    columnData = allApplicationData.weekActivityTypes.dataPerVisit.slice();
    dataLabels = allApplicationData.weekActivityTypes.labelsPerVisit.slice();
    seriesLabels = [];
    nextChartORef = chartRefs.length;

    //The first entry in the row contains the label used for the data
    allApplicationData.weekActivityTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('weekly-activity-types-per-overall-card',
        cardClasses + " per-visit hidden",
        '<div id="weekly-activity-types-per-overall"></div><button id="weekly-activity-types-per-overall-button">Change overall weekly activity types chart</button>',
        'weekly-activity-types-per-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activity-types-per-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Activity type");




    /* 
    Build weekly horizontal bar graphs of activities with absolute numbers.  Relies on the data already being present within:
        allApplicationData.weekActivities.data
        allApplicationData.weekActivities.labels
        
*/
    columnData = allApplicationData.weekActivities.data.slice();
    dataLabels = allApplicationData.weekActivities.labels.slice();
    seriesLabels = [];
    nextChartORef = chartRefs.length;


    //The first entry in the row contains the label used for the data
    allApplicationData.weekActivities.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('weekly-activities-overall-card',
        cardClasses + " details hidden",
        '<div id="weekly-activities-overall"></div><button id="weekly-activities-overall-button">Change overall weekly activities chart</button>',
        'weekly-activities-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activities-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Activity");


    /* 
    Build weekly horizontal bar graphs of activities per visit.  Relies on the data already being present within:
        allApplicationData.weekActivities.dataPerVisit
        allApplicationData.weekActivities.labelsPerVisit
        
*/
    columnData = allApplicationData.weekActivities.dataPerVisit.slice();
    dataLabels = allApplicationData.weekActivities.labelsPerVisit.slice();
    seriesLabels = [];
    nextChartORef = chartRefs.length;

    //The first entry in the row contains the label used for the data
    allApplicationData.weekActivities.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('weekly-activities-per-overall-card',
        cardClasses + " details-per-visit hidden",
        '<div id="weekly-activities-per-overall"></div><button id="weekly-activities-per-overall-button">Change overall weekly activities per visit chart</button>',
        'weekly-activities-per-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activities-per-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Activity");




    /* 
    Build yearly vertical stacked bar graphs of activities.  Relies on the data already being present within:
        allApplicationData.yearActivities.data
        last12MonthsLabels
        
*/
    /*columnData = allApplicationData.yearActivities.data.slice();
    nextChartORef = chartRefs.length;
    seriesLabels = [];

    //The first entry in the row contains the label used for the data
    allApplicationData.yearActivities.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('yearly-activities-overall-card',
        cardClasses,
        '<div id="yearly-activities-overall"></div><button id="yearly-activities-overall-button">Change overall yearly activities chart</button>',
        'yearly-activities-overall-button',
        "transformVerticalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-activities-overall", last12MonthsLabels, seriesLabels);
    chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of activities");*/


    /* 
    Build yearly vertical stacked bar graphs of activity types.  Relies on the data already being present within:
        allApplicationData.yearActivityTypes.data
        last12MonthsLabels
        
*/
    columnData = allApplicationData.yearActivityTypes.data.slice();
    nextChartORef = chartRefs.length;
    seriesLabels = [];

    //Set-up overall chart
    //The first entry in the row contains the label used for the data
    allApplicationData.yearActivityTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element 
    createElement('yearly-activity-types-overall-card',
        cardClasses,
        '<div id="yearly-activity-types-overall"></div><button id="yearly-activity-types-overall-button">Change overall yearly activity types chart</button>',
        'yearly-activity-types-overall-button',
        "transformVerticalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-activity-types-overall", last12MonthsLabels, seriesLabels);
    chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of activities");


    //Layout the screen with charts
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

        //Create the DOM element 
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
        allApplicationData.currentWeekSessionData
        allApplicationData.lastWeekSessionData
        allApplicationData.lastYearMedianSessionData
        
        For each app:
        applicationData[appName].currentWeekSessionData
        applicationData[appName].lastWeekSessionData
        applicationData[appName].lastYearMedianSessionData
*/
function buildWeeklySessionCharts() {
    "use strict";

    var currentWeekArray, lastWeekArray, lastYearArray;
    var columnData = [];



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

        //Create the DOM element 
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

/* 
    Build all yearly browser usage charts - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the daya already being present within:
        allApplicationData.browserData[browserName]
        
        For each app:
        applicationData[appName].browserData[browserName]
*/
function buildYearlyBrowserCharts() {
    "use strict";

    var seriesArray = [];
    var columnData = [];


    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = [];
        var nextChartRef = chartRefs.length;

        //Map in values for each browser month combination to the series then add to the columnData
        topBrowsersArray.forEach(function (browserName) {
            applicationData[APP_NAMES[appCounter]].browserData[browserName].unshift(browserName);
            columnData.push(applicationData[APP_NAMES[appCounter]].browserData[browserName]);
        });


        //Create the DOM element 
        createElement('yearly-browsers-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="yearly-browsers-' + ELEMENT_NAMES[appCounter] + '"></div><button id="yearly-browsers-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' browsers chart</button>',
            'yearly-browsers-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformVerticalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'yearly-browsers-' + ELEMENT_NAMES[appCounter], last12MonthsLabels, topBrowsersArray);
        chartRefs[nextChartRef].createStackedVerticalBarChart("Percentage of visits");


    }

    msnry.layout();


}

/* 
    Build all visitor return charts - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the daya already being present within:
        allApplicationData.visitorReturns.data
        
        For each app:
        applicationData[appName].visitorReturns.data
*/
function buildVisitorReturnCharts() {
    "use strict";

    var columnData = allApplicationData.visitorReturns.data;
    var dataLabels, seriesLabels;


    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].visitorReturns.data;
        dataLabels = applicationData[APP_NAMES[appCounter]].visitorReturns.labels;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].visitorReturns.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('visitor-return-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="visitor-return-' + ELEMENT_NAMES[appCounter] + '"></div><button id="visitor-return-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' visitor return chart</button>',
            'visitor-return-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformHorizontalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'visitor-return-' + ELEMENT_NAMES[appCounter], dataLabels, seriesLabels);
        chartRefs[nextChartRef].createHorizontalBarChart("Time to return");

    }

    msnry.layout();

}

/* 
    Build weekly horizontal bar graphs of search types with absolute numbers for - overall, lassi, lassi spear,  smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.weekSearchTypes.data
        allApplicationData.weekSearchTypes.labels
        
        For each app:
        applicationData[appName].weekSearchTypes.data
        applicationData[appName].weekSearchTypes.labels
        
*/
function buildWeekSearchTypes() {
    "use strict";

    var columnData = allApplicationData.weekSearchTypes.data;
    var dataLabels = allApplicationData.weekSearchTypes.labels;
    var seriesLabels = [];

    var nextChartORef = chartRefs.length;



    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].weekSearchTypes.data;
        dataLabels = applicationData[APP_NAMES[appCounter]].weekSearchTypes.labels;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].weekSearchTypes.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('weekly-search-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="weekly-search-' + ELEMENT_NAMES[appCounter] + '"></div><button id="weekly-search-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' weekly search chart</button>',
            'weekly-search-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformHorizontalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'weekly-search-' + ELEMENT_NAMES[appCounter], dataLabels, seriesLabels);
        chartRefs[nextChartRef].createHorizontalBarChart("Search type");

    }
    msnry.layout();
}

/* 
    Build weekly horizontal bar graphs of search types per visit for - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.weekSearchTypes.dataPerVisit
        allApplicationData.weekSearchTypes.labelsPerVisit
        
        For each app:
        applicationData[appName].weekSearchTypes.dataPerVisit
        applicationData[appName].yearSearchTypes.labelsPerVisit
        
*/
function buildWeekPerVisitSearchTypes() {
    //Now add in the data per visit charts
    var columnData = allApplicationData.weekSearchTypes.dataPerVisit;
    var dataLabels = allApplicationData.weekSearchTypes.labelsPerVisit;
    var seriesLabels = [];
    var nextChartORef = chartRefs.length;



    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].weekSearchTypes.dataPerVisit;
        dataLabels = applicationData[APP_NAMES[appCounter]].weekSearchTypes.labelsPerVisit;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].weekSearchTypes.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('weekly-search-per-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="weekly-search-per-' + ELEMENT_NAMES[appCounter] + '"></div><button id="weekly-search-per-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' weekly search chart</button>',
            'weekly-search-per-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformHorizontalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'weekly-search-per-' + ELEMENT_NAMES[appCounter], dataLabels, seriesLabels);
        chartRefs[nextChartRef].createHorizontalBarChart("Search type");

    }

    msnry.layout();

}

/* 
    Build yearly vertical stacked bar graphs of search types - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.yearSearchTypes.data
        
        For each app:
        applicationData[appName].yearSearchTypes.data
        
        last12MonthsLabels
        
*/
function buildYearSearchTypes() {
    //Now add in the data per visit charts
    var columnData = allApplicationData.yearSearchTypes.data;
    var nextChartORef = chartRefs.length;
    var seriesLabels = [];



    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].yearSearchTypes.data;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].yearSearchTypes.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('yearly-search-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="yearly-search-' + ELEMENT_NAMES[appCounter] + '"></div><button id="yearly-search-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' yearly search chart</button>',
            'yearly-search-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformVerticalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'yearly-search-' + ELEMENT_NAMES[appCounter], last12MonthsLabels, seriesLabels);
        chartRefs[nextChartRef].createStackedVerticalBarChart("Percentage of searches");

    }

    msnry.layout();

}


/* 
    Build weekly horizontal bar graphs for map types - overall, lassi, lassi spear,  smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.weekMapTypes.data
        allApplicationData.weekMapTypes.labels
        
        For each app:
        applicationData[appName].weekMapTypes.data
        applicationData[appName].weekMapTypes.labels
        
*/
function buildWeekMapTypes() {
    "use strict";

    var columnData = allApplicationData.weekMapTypes.data;
    var dataLabels = allApplicationData.weekMapTypes.labels;
    var seriesLabels = [];

    var nextChartORef = chartRefs.length;




    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].weekMapTypes.data;
        dataLabels = applicationData[APP_NAMES[appCounter]].weekMapTypes.labels;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].weekMapTypes.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('weekly-maps-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="weekly-maps-' + ELEMENT_NAMES[appCounter] + '"></div><button id="weekly-maps-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' weekly map types chart</button>',
            'weekly-maps-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformHorizontalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'weekly-maps-' + ELEMENT_NAMES[appCounter], dataLabels, seriesLabels);
        chartRefs[nextChartRef].createHorizontalBarChart("Map type");

    }
    msnry.layout();
}

/* 
    Build yearly vertical stacked bar graphs of map types - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.yearSearchTypes.data
        
        For each app:
        applicationData[appName].yearMapTypes.data
        
        last12MonthsLabels
        
*/
function buildYearMapTypes() {
    //Now add in the data per visit charts
    var columnData = allApplicationData.yearMapTypes.data;
    var nextChartORef = chartRefs.length;
    var seriesLabels = [];




    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].yearMapTypes.data;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].yearMapTypes.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('yearly-maps-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="yearly-maps-' + ELEMENT_NAMES[appCounter] + '"></div><button id="yearly-maps-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' yearly map types chart</button>',
            'yearly-maps-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformVerticalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'yearly-maps-' + ELEMENT_NAMES[appCounter], last12MonthsLabels, seriesLabels);
        chartRefs[nextChartRef].createStackedVerticalBarChart("Percentage of searches");

    }

    msnry.layout();

}

/* 
    Build weekly horizontal bar graphs of activities with absolute numbers for - overall, lassi, lassi spear,  smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.weekActivities.data
        allApplicationData.weekActivities.labels
        
        For each app:
        applicationData[appName].weekActivities.data
        applicationData[appName].weekActivities.labels
        
*/
function buildWeekActivities() {
    "use strict";

    var columnData = allApplicationData.weekActivities.data;
    var dataLabels = allApplicationData.weekActivities.labels;
    var seriesLabels = [];

    var nextChartORef = chartRefs.length;


    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].weekActivities.data;
        dataLabels = applicationData[APP_NAMES[appCounter]].weekActivities.labels;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].weekActivities.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('weekly-activities-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="weekly-activities-' + ELEMENT_NAMES[appCounter] + '"></div><button id="weekly-activities-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' weekly activities chart</button>',
            'weekly-activities-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformHorizontalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'weekly-activities-' + ELEMENT_NAMES[appCounter], dataLabels, seriesLabels);
        chartRefs[nextChartRef].createHorizontalBarChart("Activity");

    }
    msnry.layout();
}

/* 
    Build weekly horizontal bar graphs of activities per visit for - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.weekActivities.dataPerVisit
        allApplicationData.weekActivities.labelsPerVisit
        
        For each app:
        applicationData[appName].weekActivities.dataPerVisit
        applicationData[appName].weekActivities.labelsPerVisit
        
*/
function buildWeekPerVisitActivities() {
    //Now add in the data per visit charts
    var columnData = allApplicationData.weekActivities.dataPerVisit;
    var dataLabels = allApplicationData.weekActivities.labelsPerVisit;
    var seriesLabels = [];
    var nextChartORef = chartRefs.length;



    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].weekActivities.dataPerVisit;
        dataLabels = applicationData[APP_NAMES[appCounter]].weekActivities.labelsPerVisit;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].weekActivities.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('weekly-activities-per-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="weekly-activities-per-' + ELEMENT_NAMES[appCounter] + '"></div><button id="weekly-activities-per-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' weekly activities per visit chart</button>',
            'weekly-activities-per-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformHorizontalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'weekly-activities-per-' + ELEMENT_NAMES[appCounter], dataLabels, seriesLabels);
        chartRefs[nextChartRef].createHorizontalBarChart("Activity");

    }

    msnry.layout();

}

/* 
    Build weekly horizontal bar graphs of activity types with absolute numbers for - overall, lassi, lassi spear,  smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.weekActivityTypes.data
        allApplicationData.weekActivityTypes.labels
        
        For each app:
        applicationData[appName].weekActivityTypes.data
        applicationData[appName].weekActivityTypes.labels
        
*/
function buildWeekActivityTypes() {
    "use strict";

    var columnData = allApplicationData.weekActivityTypes.data;
    var dataLabels = allApplicationData.weekActivityTypes.labels;
    var seriesLabels = [];

    var nextChartORef = chartRefs.length;


    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].weekActivityTypes.data;
        dataLabels = applicationData[APP_NAMES[appCounter]].weekActivityTypes.labels;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].weekActivityTypes.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('weekly-activity-types-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="weekly-activity-types-' + ELEMENT_NAMES[appCounter] + '"></div><button id="weekly-activity-types-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' weekly activity types chart</button>',
            'weekly-activity-types-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformHorizontalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'weekly-activity-types-' + ELEMENT_NAMES[appCounter], dataLabels, seriesLabels);
        chartRefs[nextChartRef].createHorizontalBarChart("Activity type");

    }
    msnry.layout();
}

/* 
    Build weekly horizontal bar graphs of activities per visit for - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.weekActivityTypes.dataPerVisit
        allApplicationData.weekActivityTypes.labelsPerVisit
        
        For each app:
        applicationData[appName].weekActivityTypes.dataPerVisit
        applicationData[appName].weekActivityTypes.labelsPerVisit
        
*/
function buildWeekPerVisitActivityTypes() {
    //Now add in the data per visit charts
    var columnData = allApplicationData.weekActivityTypes.dataPerVisit;
    var dataLabels = allApplicationData.weekActivityTypes.labelsPerVisit;
    var seriesLabels = [];
    var nextChartORef = chartRefs.length;


    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].weekActivityTypes.dataPerVisit;
        dataLabels = applicationData[APP_NAMES[appCounter]].weekActivityTypes.labelsPerVisit;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].weekActivityTypes.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('weekly-activity-types-per-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="weekly-activity-types-per-' + ELEMENT_NAMES[appCounter] + '"></div><button id="weekly-activity-types-per-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' weekly activity types chart</button>',
            'weekly-activity-types-per-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformHorizontalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'weekly-activity-types-per-' + ELEMENT_NAMES[appCounter], dataLabels, seriesLabels);
        chartRefs[nextChartRef].createHorizontalBarChart("Activity type");

    }

    msnry.layout();

}


/* 
    Build yearly vertical stacked bar graphs of activities - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.yearActivities.data
        
        For each app:
        applicationData[appName].yearActivities.data
        
        last12MonthsLabels
        
*/
function buildYearActivities() {
    //Now add in the data per visit charts
    var columnData = allApplicationData.yearActivities.data;
    var nextChartORef = chartRefs.length;
    var seriesLabels = [];


    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].yearActivities.data;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].yearActivities.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('yearly-activities-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="yearly-activities-' + ELEMENT_NAMES[appCounter] + '"></div><button id="yearly-activities-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' yearly activities chart</button>',
            'yearly-activities-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformVerticalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'yearly-activities-' + ELEMENT_NAMES[appCounter], last12MonthsLabels, seriesLabels);
        chartRefs[nextChartRef].createStackedVerticalBarChart("Percentage of activities");

    }

    msnry.layout();

}


/* 
    Build yearly vertical stacked bar graphs of activity types - overall, lassi, lassi spear, smes, smes edit, vicnames, landata tpi, landata vmt
      Relies on the data already being present within:
        allApplicationData.yearActivityTypes.data
        
        For each app:
        applicationData[appName].yearActivityTypes.data
        
        last12MonthsLabels
        
*/
function buildYearActivityTypes() {
    //Now add in the data per visit charts
    var columnData = allApplicationData.yearActivityTypes.data;
    var nextChartORef = chartRefs.length;
    var seriesLabels = [];


    //Now run through each of the application charts
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Set-up lassi chart
        columnData = applicationData[APP_NAMES[appCounter]].yearActivityTypes.data;
        seriesLabels = [];

        var nextChartRef = chartRefs.length;

        //The first entry in the row contains the label used for the data
        applicationData[APP_NAMES[appCounter]].yearActivityTypes.data.forEach(function (dataRow) {
            seriesLabels.push(dataRow[0]);
        });

        //Create the DOM element 
        createElement('yearly-activity-types-' + ELEMENT_NAMES[appCounter] + '-card',
            'card ' + ELEMENT_NAMES[appCounter],
            '<div id="yearly-activity-types-' + ELEMENT_NAMES[appCounter] + '"></div><button id="yearly-activity-types-' + ELEMENT_NAMES[appCounter] +
            '-button">Change ' + ELEMENT_NAMES[appCounter] + ' yearly activity types chart</button>',
            'yearly-activity-types-' + ELEMENT_NAMES[appCounter] + '-button',
            "transformVerticalStackedGrouped", nextChartRef);

        chartRefs[nextChartRef] = new C3StatsChart(columnData, 'yearly-activity-types-' + ELEMENT_NAMES[appCounter], last12MonthsLabels, seriesLabels);
        chartRefs[nextChartRef].createStackedVerticalBarChart("Percentage of activities");

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

/*
    Polyfill for Object.assign to copy one object to another
*/
if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (target) {
            'use strict';
            if (target === undefined || target === null) {
                throw new TypeError('Cannot convert first argument to object');
            }

            var to = Object(target);
            for (var i = 1; i < arguments.length; i++) {
                var nextSource = arguments[i];
                if (nextSource === undefined || nextSource === null) {
                    continue;
                }
                nextSource = Object(nextSource);

                var keysArray = Object.keys(nextSource);
                for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                    var nextKey = keysArray[nextIndex];
                    var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
                    if (desc !== undefined && desc.enumerable) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
            return to;
        }
    });
}
