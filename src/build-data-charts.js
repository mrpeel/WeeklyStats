/*global window, document, Promise, console, topPagesFilter, topBrowsersFilter, startDate, endDate, ids, lastWeekStartDate, lastWeekEndDate  */
/*global lastYearStartDate, lastYearEndDate, currentWeekdayLabels, last12MonthsLabels,  YearlyDataLabels, allApplicationData, applicationData */
/*global APP_NAMES, APP_LABELS, topBrowsersArray, Masonry, formatDateString, C3StatsChart, assert */


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
window.onload = function () {
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

/* 
    Build the yearly page breakdown chart
      Relies on the daya already being present within:
        allApplicationData.pageData
        
*/
function buildYearlyPagesChart() {
    "use strict";

    var seriesArray = [];
    var columnData = [];
    var nextChartORef = chartRefs.length;

    //Set-up overall chart

    //Map in values for each page month combination to the series then add to the columnData
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
        //Add in the application label as the data set name
        allApplicationData.pageData[APP_NAMES[appCounter]].unshift(APP_LABELS[appCounter]);
        //add data set to chart column data
        columnData.push(allApplicationData.pageData[APP_NAMES[appCounter]]);
    }


    //Create the DOM element (if it doesn't exist already)
    createElement('yearly-pages-overall-card',
            'card full-width overall',
            '<div id="yearly-pages-overall"></div><button id="yearly-pages-overall-button">Change overall yearly pages chart</button>',
            'yearly-pages-overall-button',
            "transformVerticalStackedGrouped", nextChartORef)
        .then(function () {
            chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-pages-overall", last12MonthsLabels, APP_LABELS);
            chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of visits");

        });



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

    //Create the DOM element (if it doesn't exist already)
    createElement('weekly-users-overall-card',
            'card full-width home overall',
            '<div id="weekly-users-overall"></div><button id="weekly-users-overall-button">Change overall weekly users chart</button>',
            'weekly-users-overall-button',
            "transformArea", nextChartORef)
        .then(function () {
            chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-users-overall");
            chartRefs[nextChartORef].createWeekDayAreaChart();
        });


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
                "transformArea", nextChartRef)
            .then(function () {
                chartRefs[nextChartRef] = new C3StatsChart(columnData, "weekly-users-" + ELEMENT_NAMES[appCounter]);
                chartRefs[nextChartRef].createWeekDayAreaChart();

            });

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
            '<div id="yearly-users-overall"></div>')
        .then(function () {
            chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-users-overall", last12MonthsLabels);
            chartRefs[nextChartORef].createStaticVerticalTwoSeriesBarChart();
        });



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
                '<div id="yearly-users-' + ELEMENT_NAMES[appCounter] + '"></div>')
            .then(function () {
                chartRefs[nextChartRef] = new C3StatsChart(columnData, "yearly-users-" + ELEMENT_NAMES[appCounter], last12MonthsLabels);
                chartRefs[nextChartRef].createStaticVerticalTwoSeriesBarChart();
            });


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
            "transformArea", nextChartORef)
        .then(function () {
            chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-sessions-overall");
            chartRefs[nextChartORef].createWeekDayAreaChart();
        });


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
                "transformArea", nextChartRef)
            .then(function () {
                chartRefs[nextChartRef] = new C3StatsChart(columnData, "weekly-sessions-" + ELEMENT_NAMES[appCounter]);
                chartRefs[nextChartRef].createWeekDayAreaChart();
            });

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
    var nextChartORef = chartRefs.length;

    //Set-up overall chart

    //Map in values for each browser month combination to the series then add to the columnData
    topBrowsersArray.forEach(function (browserName) {
        allApplicationData.browserData[browserName].unshift(browserName);
        columnData.push(allApplicationData.browserData[browserName]);
    });


    //Create the DOM element (if it doesn't exist already)
    createElement('yearly-browsers-overall-card',
            'card full-width overall',
            '<div id="yearly-browsers-overall"></div><button id="yearly-browsers-overall-button">Change overall yearly browsers chart</button>',
            'yearly-browsers-overall-button',
            "transformVerticalStackedGrouped", nextChartORef)
        .then(function () {
            chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-browsers-overall", last12MonthsLabels, topBrowsersArray);
            chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of visits");
        });



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


        //Create the DOM element (if it doesn't exist already)
        createElement('yearly-browsers-' + ELEMENT_NAMES[appCounter] + '-card',
                'card ' + ELEMENT_NAMES[appCounter],
                '<div id="yearly-browsers-' + ELEMENT_NAMES[appCounter] + '"></div><button id="yearly-browsers-' + ELEMENT_NAMES[appCounter] +
                '-button">Change ' + ELEMENT_NAMES[appCounter] + ' browsers chart</button>',
                'yearly-browsers-' + ELEMENT_NAMES[appCounter] + '-button',
                "transformVerticalStackedGrouped", nextChartRef)
            .then(function () {
                chartRefs[nextChartRef] = new C3StatsChart(columnData, 'yearly-browsers-' + ELEMENT_NAMES[appCounter], last12MonthsLabels, topBrowsersArray);
                chartRefs[nextChartRef].createStackedVerticalBarChart("Percentage of visits");
            });

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
    var dataLabels = allApplicationData.visitorReturns.labels;
    var seriesLabels = [];

    var nextChartORef = chartRefs.length;

    //Set-up overall chart

    //The first entry in the row contains the label used for the data
    allApplicationData.visitorReturns.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element (if it doesn't exist already)
    createElement('visitor-return-overall-card',
        'card full-width overall',
        '<div id="visitor-return-overall"></div><button id="visitor-return-overall-button">Change overall visitor return chart</button>',
        'visitor-return-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "visitor-return-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Time to return");


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

        //Create the DOM element (if it doesn't exist already)
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

    //Set-up overall chart

    //The first entry in the row contains the label used for the data
    allApplicationData.weekSearchTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element (if it doesn't exist already)
    createElement('weekly-search-overall-card',
        'card full-width overall',
        '<div id="weekly-search-overall"></div><button id="weekly-search-overall-button">Change overall weekly search chart</button>',
        'weekly-search-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-search-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Search type");


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

        //Create the DOM element (if it doesn't exist already)
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

    //Set-up overall chart

    //The first entry in the row contains the label used for the data
    allApplicationData.weekSearchTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element (if it doesn't exist already)
    createElement('weekly-search-per-overall-card',
        'card full-width overall',
        '<div id="weekly-search-per-overall"></div><button id="weekly-search-per-overall-button">Change overall weekly search chart</button>',
        'weekly-search-per-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-search-per-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Search type");


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

        //Create the DOM element (if it doesn't exist already)
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

    //Set-up overall chart
    //The first entry in the row contains the label used for the data
    allApplicationData.yearSearchTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element (if it doesn't exist already)
    createElement('yearly-search-overall-card',
        'card full-width overall',
        '<div id="yearly-search-overall"></div><button id="yearly-search-overall-button">Change overall yearly search chart</button>',
        'yearly-search-overall-button',
        "transformVerticalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-search-overall", last12MonthsLabels, seriesLabels);
    chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of searches");


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

        //Create the DOM element (if it doesn't exist already)
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

    //Set-up overall chart

    //The first entry in the row contains the label used for the data
    allApplicationData.weekMapTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element (if it doesn't exist already)
    createElement('weekly-maps-overall-card',
        'card full-width overall',
        '<div id="weekly-maps-overall"></div><button id="weekly-maps-overall-button">Change overall weekly map types chart</button>',
        'weekly-maps-overall-button',
        "transformHorizontalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-maps-overall", dataLabels, seriesLabels);
    chartRefs[nextChartORef].createHorizontalBarChart("Map type");


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

        //Create the DOM element (if it doesn't exist already)
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

    //Set-up overall chart
    //The first entry in the row contains the label used for the data
    allApplicationData.yearMapTypes.data.forEach(function (dataRow) {
        seriesLabels.push(dataRow[0]);
    });


    //Create the DOM element (if it doesn't exist already)
    createElement('yearly-maps-overall-card',
        'card full-width overall',
        '<div id="yearly-maps-overall"></div><button id="yearly-maps-overall-button">Change overall yearly map types chart</button>',
        'yearly-maps-overall-button',
        "transformVerticalStackedGrouped", nextChartORef);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-maps-overall", last12MonthsLabels, seriesLabels);
    chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of map types");


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

        //Create the DOM element (if it doesn't exist already)
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
