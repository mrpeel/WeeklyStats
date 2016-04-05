/*global window, document, Promise, console, topPagesFilter, topBrowsersFilter, startDate, endDate, ids, lastWeekStartDate, lastWeekEndDate  */
/*global lastYearStartDate, lastYearEndDate, currentWeekdayLabels, last12MonthsLabels,  YearlyDataLabels, allApplicationData, applicationData */
/*global APP_NAMES, APP_LABELS, topBrowsersArray, deviceCategories, formatDateString, C3StatsChart, assert, changeRetrievalDate, returnLastFullWeekDate, gapi */
/*global setupRetrieval, componentHandler, navigator, performance */


//The element suffixes which are used to differentiate elements for the same data type
var ELEMENT_NAMES = ["lassi", "lassi-spear", "smes", "vicnames", "landata-tpi", "landata-vmt"];


//Holds the indidivudal chart references
var chartRefs = [];
var refreshQueue = [];
var loadBar;

//Variable to hold the parent element for all chart cards
var parentElement;


//Set-up the service worker
function prepServiceWorker() {

  if (!navigator.serviceWorker) {
    return;
  }

  navigator.serviceWorker.register('sw.js').then(function (reg) {
    if (!navigator.serviceWorker.controller) {
      return;
    }

    if (reg.waiting) {
      updateReady(reg.waiting);
      return;
    }

    if (reg.installing) {
      trackInstalling(reg.installing);
      return;
    }

    reg.addEventListener('updatefound', function () {
      trackInstalling(reg.installing);
    });
  });

  // Ensure refresh is only called once (works around a bug in "force update on reload").
  var refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) {
      return;
    }
    window.location.reload();
    refreshing = true;
  });
}
//Execute the servide worker prep
prepServiceWorker();

function trackInstalling(worker) {
  worker.addEventListener('statechange', function () {
    if (worker.state == 'installed') {
      updateReady(worker);
    }
  });
}

function updateReady(worker) {
  var countdownDiv = document.getElementById("update-message");
  var countdownValue = document.getElementById("count-down-value");
  var cdVals = [5, 4, 3, 2, 1];

  countdownDiv.classList.remove("hidden");

  window.setTimeout(function () {
    worker.postMessage({
      action: 'skipWaiting'
    });
  }, 5000);

  cdVals.forEach(function (val) {
    window.setTimeout(function () {
      countdownValue.innerText = val;
    }, (5 - val) * 1000);
  });
}

/* 
    Set-up the buttons for transforming charts, opening new sections and call the masonry set-up for chart cards
*/
window.onload = function () {
  "use strict";

  parentElement = document.getElementById("chart-grid");


  window.addEventListener("hashchange", loadSubPage, false);

  loadBar = document.getElementById("load-bar");
  showLoadBar();

  //Add listener for date range changes
  var dateRangeElement = document.getElementById("weekSelector");
  dateRangeElement.value = formatDateString(returnLastFullWeekDate(), "query");
  dateRangeElement.addEventListener("change", function () {
    //Ensure a future date hasn't been selected
    var todaysDate = new Date();
    if (document.getElementById("weekSelector").value > formatDateString(todaysDate, "query")) {
      document.getElementById("weekSelector").value = formatDateString(todaysDate, "query");
    }

    showLoadBar();
    changeRetrievalDate(dateRangeElement.value);
  }, false);
};

/* 
    Update the date displayed on the screen - called after the starting date for the week is determined
*/

function updateScreenDateSelection(newDate) {
  //Re-set the on-screen date to the first day of the week
  document.getElementById("weekSelector").value = formatDateString(newDate, "query");

}

/* 
    Show the loading bar
*/

function showLoadBar() {
  loadBar.classList.remove("hidden");
}

/* 
    Hide the loading bar
*/
function hideLoadBar() {
  loadBar.classList.add("hidden");
}


/* 
    Load up the correct sub-page by looking at the hash URL.  Sub-pages are "loaded" by recreating elements in the DOM
*/

function loadSubPage(loadType) {

  var screenHashURLs = ["#overall", "#lassi", "#lassi-spear", "#smes", "#vicnames", "#landata-tpi", "#landata-vmt"];
  var hashURLIndex = screenHashURLs.indexOf(window.location.hash);
  var pageTitle = document.getElementById("page-title");
  var header = document.getElementById("header-element");
  var headerColourClassList = ["mdl-color--blue", "mdl-color--red", "mdl-color--indigo", "mdl-color--green", "mdl-color--deep-orange", "mdl-color--deep-purple",
                                 "mdl-color--teal"];
  var loadScreen;

  if (typeof loadType === "undefined" || hashURLIndex < 0) {
    loadScreen = "overall";
    hashURLIndex = 0;
  } else {
    loadScreen = window.location.hash.substr(1);
  }

  //Clear any colour classes from the header
  for (var colCounter = 0; colCounter < headerColourClassList.length; colCounter++) {
    header.classList.remove(headerColourClassList[colCounter]);
  }


  //Load the screen type if a has URL has been supplied
  showScreen(loadScreen);

  //Update which links are active / inactive
  updateActiveLinks(loadScreen);

  //Set header colour
  header.classList.add(headerColourClassList[hashURLIndex]);

  //Update title bar
  if (hashURLIndex === 0) {
    //Set the title for the overall page
    pageTitle.textContent = "Overall LASSI applications usage stats and trends";
  } else {
    //For an application page, set the title to to app label
    pageTitle.textContent = APP_LABELS[hashURLIndex - 1] + " usage stats and trends";
  }

}

/* 
    Update the links on the screen to show what has been selected
*/

function updateActiveLinks(selectionName) {
  var allLinkElements, elCounter;

  allLinkElements = document.getElementsByClassName("active-link");

  //Work through link elements and make them visible and remove is-selected class
  for (elCounter = 0; elCounter < allLinkElements.length; elCounter++) {
    allLinkElements[elCounter].classList.remove("hidden");
  }

  //Work through inactive link elements and remove is-selected class
  allLinkElements = document.getElementsByClassName("inactive-link");
  for (elCounter = 0; elCounter < allLinkElements.length; elCounter++) {
    allLinkElements[elCounter].classList.remove("is-selected");
    allLinkElements[elCounter].classList.remove("mdl-color-text--blue-200");
    allLinkElements[elCounter].classList.remove("mdl-color-text--grey");
    allLinkElements[elCounter].classList.add("hidden");
  }



  //Now hide active-link element, replace with non-link element and set is-selected
  document.getElementById(selectionName + "-link").classList.add("hidden");
  document.getElementById(selectionName + "-non-link").classList.remove("hidden");
  document.getElementById(selectionName + "-non-link").classList.add("is-selected");
  document.getElementById(selectionName + "-non-link").classList.add("mdl-color-text--cyan-100");

  //Repeat the process for the drawer links
  document.getElementById("drawer-" + selectionName + "-link").classList.add("hidden");
  document.getElementById("drawer-" + selectionName + "-non-link").classList.remove("hidden");
  document.getElementById("drawer-" + selectionName + "-non-link").classList.add("is-selected");
  document.getElementById("drawer-" + selectionName + "-non-link").classList.add("mdl-color-text--black");

}

/* 
    Disable all links on the screen during loading
*/
function disableAllLinks() {
  var allLinkElements, elCounter;

  //Work through link elements and make them invisible
  allLinkElements = document.getElementsByClassName("active-link");
  for (elCounter = 0; elCounter < allLinkElements.length; elCounter++) {
    allLinkElements[elCounter].classList.add("hidden");
  }

  //Work through inactive link elements and make them visible
  allLinkElements = document.getElementsByClassName("inactive-link");
  for (elCounter = 0; elCounter < allLinkElements.length; elCounter++) {
    allLinkElements[elCounter].classList.remove("hidden");
    allLinkElements[elCounter].classList.add("mdl-color-text--grey");
  }


}


/* 
    Work through all charts and refresh them
*/
function refreshCharts() {
  "use strict";

  //console.log('Start refresh charts');
  refreshQueue.length = 0;

  for (var cCounter = 0; cCounter < chartRefs.length; cCounter++) {
    refreshQueue.push(cCounter);
  }

  //console.log(refreshQueue);

  window.setTimeout(function () {
    executeRefresh();
  }, 500);

}

/* 
    Refresh a chart after an interval
*/
function executeRefresh() {
  "use strict";

  if (refreshQueue.length > 0) {
    var chartNum = refreshQueue.pop();

    //console.log('Execute refresh chart ' + chartNum);

    if (typeof chartRefs[chartNum].chart !== "undefined") {
      //console.log('Flushing now');
      chartRefs[chartNum].chart.flush();
    }


    window.setTimeout(function () {
      executeRefresh();
    }, 100);

  } else {
    //Ensure layout is correct after refresh
    //msnry.layout();
  }

}

/**
 * Checks if an element with the specified Id exists in the DOM.  If not, a new div element is created.  If a button Id and button function are specified, will also 
 *    add an event listener to the button.
 * @param {string} elementId - the id for the element
 * @param {string} elementClassString - the class(es) to be applied to the element
 * @param {string} elementHTML - the HTML for the element
 * @param {string} buttonId - Optional id of the button to add an event listener for
 * @param {string} transformFunctionType - if a button has been specified, the type of transform to run
 * @param {number} chartRef - the reference number for the chart object
 */
function createElement(elementId, elementClassString, elementHTML, buttonId, transformFunctionType, chartRef, docFragment) {
  "use strict";

  assert(typeof elementId !== "undefined", 'createElement assert failed - elementId: ' + elementId);
  assert(typeof elementHTML !== "undefined", 'createElement assert failed - elementHTML: ' + elementHTML);
  //Check that a buttoinId and function have been supplied together or not at all
  assert((typeof buttonId !== "undefined" && typeof transformFunctionType !== "undefined" && typeof chartRef === "number") ||
    (typeof buttonId === "undefined" && typeof transformFunctionType === "undefined" && typeof chartRef === "undefined"),
    'createElement assert failed - button parameters: ' + buttonId + ', ' + transformFunctionType + ', ' + chartRef);

  //if (document.getElementById(elementId) === null) {
  var newDiv = document.createElement('div');

  newDiv.id = elementId;
  newDiv.className = elementClassString;
  newDiv.innerHTML = elementHTML;

  /*if (docFragment) {
    docFragment.appendChild(newDiv);
  } else {*/
  parentElement.appendChild(newDiv);

  //Tell masonry that the item has been added
  //msnry.appended(newDiv);
  //}

  //Add a button event listener if required
  if (typeof buttonId !== "undefined") {
    //Use type of transformation to define button click event
    var transformButton;
    /*if (docFragment) {
      transformButton = docFragment.getElementById(buttonId);
    } else {*/
    transformButton = document.getElementById(buttonId);
    //}
    if (transformFunctionType === "transformArea") {
      transformButton.addEventListener("click", function () {
        //Re-set the correct transform icon
        if (transformButton.classList.contains("area-chart")) {
          transformButton.innerHTML = '<i class="material-icons">timeline</i>';
          transformButton.classList.add("bar-chart");
          transformButton.classList.remove("area-chart");
        } else {
          transformButton.innerHTML = '<i class="material-icons">equalizer</i>';
          transformButton.classList.add("area-chart");
          transformButton.classList.remove("bar-chart");
        }

        transformArea(chartRef);
      }, false);
    } else if (transformFunctionType === "transformHorizontalStackedGrouped") {
      transformButton.addEventListener("click", function () {
        //Re-set the correct transform icon
        if (transformButton.classList.contains("stacked-chart")) {
          transformButton.innerHTML = '<i class="material-icons">sort</i>';
          transformButton.classList.add("grouped-chart");
          transformButton.classList.remove("stacked-chart");
        } else {
          transformButton.innerHTML = '<i class="material-icons">view_carousel</i>';
          transformButton.classList.add("stacked-chart");
          transformButton.classList.remove("grouped-chart");
        }

        transformHorizontalStackedGrouped(chartRef);
      }, false);
    } else if (transformFunctionType === "transformVerticalStackedGrouped") {
      transformButton.addEventListener("click", function () {
        if (transformButton.classList.contains("stacked-chart")) {
          transformButton.innerHTML = '<i class="material-icons">equalizer</i>';
          transformButton.classList.add("grouped-chart");
          transformButton.classList.remove("stacked-chart");
        } else {
          transformButton.innerHTML = '<i class="material-icons">view_column</i>';
          transformButton.classList.add("stacked-chart");
          transformButton.classList.remove("grouped-chart");
        }

        transformVerticalStackedGrouped(chartRef);
      }, false);

    }

  }

  //}


}

function clearChartsFromScreen() {
  //Clear the chart references
  chartRefs.length = 0;

  //Remove the items from masonry and the DOM
  while (parentElement.firstChild) {
    //Check if masonry object has been created - if so, remove the element from it
    parentElement.removeChild(parentElement.firstChild);
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
function showScreen(appElementName) {

  showLoadBar();

  clearChartsFromScreen();

  var appGAName = "";

  for (var elementCounter = 0; elementCounter < ELEMENT_NAMES.length; elementCounter++) {
    if (ELEMENT_NAMES[elementCounter] === appElementName) {
      appGAName = APP_NAMES[elementCounter];
      break;
    }
  }

  buildChartsForType(appElementName, appGAName);

  //Set-up button listening events
  document.getElementById("weekly-search-" + appElementName + "-switch-to-per-button").addEventListener("click", function () {
    switchVisibleChart("weekly-search-per-" + appElementName + "-card", ["weekly-search-" + appElementName + "-card"]);
  }, false);

  document.getElementById("weekly-search-" + appElementName + "-switch-to-raw-button").addEventListener("click", function () {
    switchVisibleChart("weekly-search-" + appElementName + "-card", ["weekly-search-per-" + appElementName + "-card"]);
  }, false);

  //Buttons on the activity type absolute number chart
  document.getElementById("weekly-activity-types-" + appElementName + "-switch-to-per-button").addEventListener("click", function () {
    switchVisibleChart("weekly-activity-types-per-" + appElementName + "-card", ["weekly-activity-types-" + appElementName + "-card", "weekly-activities-" + appElementName + "-card",
                            "weekly-activities-per-" + appElementName + "-card"]);
  }, false);
  document.getElementById("weekly-activity-types-" + appElementName + "-switch-to-raw-activities-button").addEventListener("click", function () {
    switchVisibleChart("weekly-activities-" + appElementName + "-card", ["weekly-activity-types-per-" + appElementName + "-card", "weekly-activity-types-" + appElementName + "-card",
                            "weekly-activities-per-" + appElementName + "-card"]);
  }, false);

  //Buttons on the activity type per-visit chart
  document.getElementById("weekly-activity-types-" + appElementName + "-switch-to-raw-button").addEventListener("click", function () {
    switchVisibleChart("weekly-activity-types-" + appElementName + "-card", ["weekly-activity-types-per-" + appElementName + "-card", "weekly-activities-" + appElementName + "-card",
                            "weekly-activities-per-" + appElementName + "-card"]);
  }, false);
  document.getElementById("weekly-activity-types-" + appElementName + "-switch-to-per-activities-button").addEventListener("click", function () {
    switchVisibleChart("weekly-activities-per-" + appElementName + "-card", ["weekly-activity-types-" + appElementName + "-card", "weekly-activity-types-per-" + appElementName + "-card",
                            "weekly-activities-" + appElementName + "-card"]);
  }, false);

  //Buttons on the detailed activities absolute number chart
  document.getElementById("weekly-activities-" + appElementName + "-switch-to-per-button").addEventListener("click", function () {
    switchVisibleChart("weekly-activities-per-" + appElementName + "-card", ["weekly-activity-types-" + appElementName + "-card", "weekly-activity-types-per-" + appElementName + "-card",
                            "weekly-activities-" + appElementName + "-card"]);
  }, false);
  document.getElementById("weekly-activities-" + appElementName + "-switch-to-raw-activity-types-button").addEventListener("click", function () {
    switchVisibleChart("weekly-activity-types-" + appElementName + "-card", ["weekly-activities-" + appElementName + "-card", "weekly-activity-types-per-" + appElementName + "-card",
                            "weekly-activities-per-" + appElementName + "-card"]);
  }, false);

  //Buttons on the detailed activities per-visit chart
  document.getElementById("weekly-activities-" + appElementName + "-switch-to-raw-button").addEventListener("click", function () {
    switchVisibleChart("weekly-activities-" + appElementName + "-card", ["weekly-activity-types-" + appElementName + "-card", "weekly-activity-types-per-" + appElementName + "-card",
                            "weekly-activities-per-" + appElementName + "-card"]);
  }, false);
  document.getElementById("weekly-activities-" + appElementName + "-switch-to-per-activity-types-button").addEventListener("click", function () {
    switchVisibleChart("weekly-activity-types-per-" + appElementName + "-card", ["weekly-activity-types-" + appElementName + "-card", "weekly-activities-" + appElementName + "-card",
                            "weekly-activities-per-" + appElementName + "-card"]);
  }, false);


  hideLoadBar();

}

/*
 * Builds the charts for the LASSI screen - the page breakdown and page visits for each app
 */
function switchVisibleChart(visibleElementName, hiddenElementNames) {

  var visibleElement = document.getElementById(visibleElementName);
  var hiddenElement;


  //Remove hidden class from visible element 
  if (typeof visibleElement !== "undefined") {
    visibleElement.classList.remove("hidden");

    //Loop through the chart references to see which one is being made visible. 
    for (var chartCounter = 0; chartCounter < chartRefs.length; chartCounter++) {
      /* Check if this is the chart being made visible
         Structure is card div -> mdl_card__actions div -> chart div
         Need to check the grandparent element */
      if (document.getElementById(chartRefs[chartCounter].pageElement).parentElement.parentElement.id === visibleElementName) {
        //Re-draw the chart
        chartRefs[chartCounter].chart.flush();
        break;
      }

    }
  }

  //Loop through supplied hidden elements and add hidden class 
  for (var elCounter = 0; elCounter < hiddenElementNames.length; elCounter++) {
    hiddenElement = document.getElementById(hiddenElementNames[elCounter]);

    if (typeof hiddenElement !== "undefined") {
      hiddenElement.classList.add("hidden");
    }
  }

  //Re-run the layout functions
  //refreshCharts();
  //msnry.layout();

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
  var t0 = performance.now();
  var docFragment = document.createDocumentFragment();

  //Set-up overall chart
  currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
  lastWeekArray = ["Week starting " + formatDateString(lastWeekStartDate, "display")];
  lastYearArray = ["Median for the last year"];

  Array.prototype.push.apply(currentWeekArray, allApplicationData.currentWeekUserData);
  Array.prototype.push.apply(lastWeekArray, allApplicationData.lastWeekUserData);
  Array.prototype.push.apply(lastYearArray, allApplicationData.lastYearMedianUserData);

  columnData.push(currentWeekdayLabels);
  columnData.push(lastYearArray);
  columnData.push(lastWeekArray);
  columnData.push(currentWeekArray);

  /*Card classes mdl-card mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--3dp*/
  /*Print Definition
  <div class="mdl-card__actions mdl-card--border print-only">
                          <div class="mdl-typography--title mdl-color-text--black">Site Visits for the Week</div>
                          <div class="chart-sub-title-text mdl-color-text--grey-600">No of visits</div>
                      </div> */

  /* Screen definition
    <div class="card-bottom-spacer"></div>
                      <div class="mdl-card__actions mdl-card--border">
                          <div class="mdl-typography--title mdl-color-text--black">Site Visits for the Week</div>
                          <div class="chart-sub-title-text mdl-color-text--grey-600">No of visits</div>
                      </div>
  */

  //Create the DOM element 
  createElement('weekly-users-overall-card',
    'card mdl-cell mdl-cell--12-col home overall',
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Visits across all applications for the week</div>' +
    '<button id="weekly-users-overall-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon area-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="weekly-users-overall-button">Switch between line chart and bar chart</div>' +
    '<div class="card-bottom-spacer"></div>' +
    '<div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-users-overall"></div>' +
    '</div>',

    //<button id="weekly-users-overall-button">Change overall weekly users chart</button>',
    'weekly-users-overall-button',
    "transformArea", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-users-overall");
  //chartRefs[nextChartORef].createWeekDayAreaChart();



  //Now run through each of the application charts
  for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
    //Set-up lassi chart
    currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
    lastWeekArray = ["Week starting " + formatDateString(lastWeekStartDate, "display")];
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
      'card mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet  home ' + ELEMENT_NAMES[appCounter],
      '<div class="card-top-spacer"></div>' +
      '<div class="mdl-typography--title chart-title">' + APP_LABELS[appCounter] + ' visits for the week</div>' +
      '<button id="weekly-users-' + ELEMENT_NAMES[appCounter] +
      '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon area-chart"><i class="material-icons">equalizer</i></button>' +
      '<div class="mdl-tooltip" for="weekly-users-' + ELEMENT_NAMES[appCounter] + '-button">Switch between line chart and bar chart</div>' +
      '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
      '<div id="weekly-users-' + ELEMENT_NAMES[appCounter] + '"></div>' +
      '</div>',
      'weekly-users-' + ELEMENT_NAMES[appCounter] + '-button',
      "transformArea", nextChartRef, docFragment);

    chartRefs[nextChartRef] = new C3StatsChart(columnData, "weekly-users-" + ELEMENT_NAMES[appCounter]);
    //chartRefs[nextChartRef].createWeekDayAreaChart();



  }

  //parentElement.appendChild(docFragment);

  //msnry.layout();

  for (var cCounter = 0; cCounter < chartRefs.length; cCounter++) {
    chartRefs[cCounter].createWeekDayAreaChart();
  }

  //refreshCharts();
  //msnry.appended(parentElement.childNodes);

  //Call the Material Design compoment upgrade to make tool-tips work
  componentHandler.upgradeAllRegistered();

  var t1 = performance.now();
  console.log("buildWeeklyUsersCharts elapsed time: " + (t1 - t0) + " milliseconds.");

}


/* 
    Build all charts for each type.  Generates all the charts for the specified type.
  
*/
function buildChartsForType(elementName, appName) {
  "use strict";

  var currentWeekArray, lastWeekArray, lastYearArray, previousYearArray, currentYearArray, dataLabels, seriesLabels;
  var columnData, nextChartORef;
  var cardClassesFull = "card mdl-cell mdl-cell--12-col " + elementName;
  var cardClassesTrend = "card mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet " + elementName;
  var cardClassesWeek = "card mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet " + elementName;
  var chartDataArray;
  var docFragment = document.createDocumentFragment();
  var t0 = performance.now();

  if (elementName === "overall") {
    chartDataArray = allApplicationData;
  } else {
    chartDataArray = applicationData[appName];
  }

  /* 
    Display special charts only visibvle for overall stats
  */

  if (elementName === "overall") {

    /*
       Build week's application visit breakdown chart
    */
    columnData = [];
    nextChartORef = chartRefs.length;
    dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];



    //Now run through each of the application charts
    for (appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {


      columnData.push([]);
      //Add name for data set
      columnData[columnData.length - 1].push(APP_LABELS[appCounter]);

      for (var dayCounter = 0; dayCounter < 7; dayCounter++) {

        columnData[columnData.length - 1].push(applicationData[APP_NAMES[appCounter]].currentWeekUserData[dayCounter]);

      }
    }

    //Create the DOM element 
    createElement('weekly-application-users-overall-card',
      cardClassesWeek,
      '<div class="card-top-spacer"></div>' +
      '<div class="mdl-typography--title chart-title">Visits by Application for the week</div>' +
      '<button id="weekly-application-users-overall-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon area-chart"><i class="material-icons">equalizer</i></button>' +
      '<div class="mdl-tooltip" for="weekly-application-users-overall-button">Switch between stacked bar chart and grouped bar chart</div>' +
      '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
      '<div id="weekly-application-users-overall"></div>' +
      '</div>',
      'weekly-application-users-overall-button',
      "transformVerticalStackedGrouped", nextChartORef, docFragment);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, 'weekly-application-users-overall', dayLabels, APP_LABELS);

    /* 
    Build the yearly page breakdown chart.  This is ONLY present for the overall chart. Relies on the data already being present within:
      allApplicationData.pageData
      
  */


    columnData = [];
    nextChartORef = chartRefs.length;
    var appCounter, dayLabels;

    //Map in values for each page month combination to the series then add to the columnData
    for (appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
      //Create data set
      columnData.push([]);
      //Add name for data set
      columnData[columnData.length - 1].push(APP_LABELS[appCounter]);
      //add data set to chart column data
      Array.prototype.push.apply(columnData[columnData.length - 1], chartDataArray.pageData[APP_NAMES[appCounter]]);
    }


    //Create the DOM element 
    createElement('yearly-pages-overall-card',
      cardClassesTrend,
      '<div class="card-top-spacer"></div>' +
      '<div class="mdl-typography--title chart-title">Visits by application trend</div>' +
      '<button id="yearly-pages-overall-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon area-chart"><i class="material-icons">equalizer</i></button>' +
      '<div class="mdl-tooltip" for="yearly-pages-overall-button">Switch between stacked bar chart and grouped bar chart</div>' +
      '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
      '<div id="yearly-pages-overall"></div>' +
      '</div>',
      'yearly-pages-overall-button',
      "transformVerticalStackedGrouped", nextChartORef, docFragment);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, 'yearly-pages-overall', last12MonthsLabels, APP_LABELS);


  }

  /* Build weekly user charts.  Relies on the daya already being present within:
      allApplicationData.currentWeekUserData
      allApplicationData.lastWeekUserData
      allApplicationData.lastYearMedianUserData
          OR
      applicationData[appName].currentWeekUserData
      applicationData[appName].lastWeekUserData
      applicationData[appName].lastYearMedianUserData
  */

  //Set-up overall chart
  columnData = [];
  currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
  lastWeekArray = ["Week starting " + formatDateString(lastWeekStartDate, "display")];
  lastYearArray = ["Median for the last year"];
  nextChartORef = chartRefs.length;

  Array.prototype.push.apply(currentWeekArray, chartDataArray.currentWeekUserData);
  Array.prototype.push.apply(lastWeekArray, chartDataArray.lastWeekUserData);
  Array.prototype.push.apply(lastYearArray, chartDataArray.lastYearMedianUserData);

  columnData.push(currentWeekdayLabels);
  columnData.push(lastYearArray);
  columnData.push(lastWeekArray);
  columnData.push(currentWeekArray);

  //Create the DOM element 
  createElement('weekly-users-' + elementName + '-card',
    cardClassesWeek,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Visits for the week</div>' +
    '<button id="weekly-users-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon area-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="weekly-users-' + elementName + '-button">Switch between line chart and bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-users-' + elementName + '"></div>' +
    '</div>',
    'weekly-users-' + elementName + '-button',
    "transformArea", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-users-" + elementName);


  /* Build current / previous year charts.  Relies on the daya already being present within:
      allApplicationData.thisYearUserData
      allApplicationData.previousYearUserData
          OR
      applicationData[appName].thisYearUserData
      applicationData[appName].previousYearUserData
  */
  columnData = [];
  previousYearArray = ["Previous year"];
  currentYearArray = ["Current year"];
  nextChartORef = chartRefs.length;

  Array.prototype.push.apply(previousYearArray, chartDataArray.previousYearUserData);
  Array.prototype.push.apply(currentYearArray, chartDataArray.thisYearUserData);

  columnData.push(previousYearArray);
  columnData.push(currentYearArray);

  //Create the DOM element 
  createElement('yearly-users-' + elementName + '-card',
    cardClassesTrend,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Visits trend</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-users-' + elementName + '"></div>' +
    '</div>');

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-users-" + elementName, last12MonthsLabels);




  /* Build weekly session duration chart.  Relies on the daya already being present within:
      allApplicationData.currentWeekSessionData
      allApplicationData.lastWeekSessionData
      allApplicationData.lastYearMedianSessionData
          OR
      applicationData[appName].currentWeekSessionData
      applicationData[appName].lastWeekSessionData
      applicationData[appName].lastYearMedianSessionData
  */
  columnData = [];
  nextChartORef = chartRefs.length;

  //Set-up overall chart
  currentWeekArray = ["Week starting " + formatDateString(startDate, "display")];
  lastWeekArray = ["Week starting " + formatDateString(lastWeekStartDate, "display")];
  lastYearArray = ["Median for the last year"];

  Array.prototype.push.apply(currentWeekArray, chartDataArray.currentWeekSessionData);
  Array.prototype.push.apply(lastWeekArray, chartDataArray.lastWeekSessionData);
  Array.prototype.push.apply(lastYearArray, chartDataArray.lastYearMedianSessionData);

  columnData.push(currentWeekdayLabels);
  columnData.push(lastYearArray);
  columnData.push(lastWeekArray);
  columnData.push(currentWeekArray);

  //Create the DOM element 
  createElement('weekly-sessions-' + elementName + '-card',
    cardClassesWeek,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Duration of visits for the week</div>' +
    '<button id="weekly-sessions-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon area-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="weekly-sessions-' + elementName + '-button">Switch between line chart and bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-sessions-' + elementName + '"></div>' +
    '</div>',
    'weekly-sessions-' + elementName + '-button',
    "transformArea", nextChartORef);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-sessions-" + elementName);


  /* 
    Build visitor return chart.  Relies on the daya already being present within:
        allApplicationData.visitorReturns.data
          OR
      applicationData[appName].visitorReturns.data
  */
  columnData = chartDataArray.visitorReturns.data.slice();
  dataLabels = chartDataArray.visitorReturns.labels.slice();
  seriesLabels = [];
  nextChartORef = chartRefs.length;

  //The first entry in the row contains the label used for the data
  chartDataArray.visitorReturns.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('visitor-return-' + elementName + '-card',
    cardClassesTrend,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Time between visits</div>' +
    '<button id="visitor-return-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="visitor-return-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="visitor-return-' + elementName + '"></div>' +
    '</div>',
    'visitor-return-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "visitor-return-" + elementName, dataLabels, seriesLabels);

  /* 
  Build weekly horizontal bar graphs for map types.  Relies on the data already being present within:
      allApplicationData.weekMapTypes.data
      allApplicationData.weekMapTypes.labels
          OR
      applicationData[appName].weekMapTypes.data
      applicationData[appName].weekMapTypes.labels
     */

  columnData = chartDataArray.weekMapTypes.data.slice();
  dataLabels = chartDataArray.weekMapTypes.labels.slice();
  seriesLabels = [];
  nextChartORef = chartRefs.length;


  //The first entry in the row contains the label used for the data
  chartDataArray.weekMapTypes.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('weekly-maps-' + elementName + '-card',
    cardClassesWeek,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Map use for the week</div>' +
    '<button id="weekly-maps-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-maps-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-maps-' + elementName + '"></div>' +
    '</div>',
    'weekly-maps-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-maps-" + elementName, dataLabels, seriesLabels);


  /* 
      Build yearly vertical stacked bar graphs of map types.  Relies on the data already being present within:
          allApplicationData.yearSearchTypes.data        
              OR
          applicationData[appName].yearSearchTypes.data
          
          last12MonthsLabels
  */
  columnData = chartDataArray.yearMapTypes.data.slice();
  seriesLabels = [];
  nextChartORef = chartRefs.length;

  //The first entry in the row contains the label used for the data
  chartDataArray.yearMapTypes.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('yearly-maps-' + elementName + '-card',
    cardClassesTrend,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Map use trend</div>' +
    '<button id="yearly-maps-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="yearly-maps-' + elementName + '-button">Switch between stacked bar chart and grouped bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-maps-' + elementName + '"></div>' +
    '</div>',
    'yearly-maps-' + elementName + '-button',
    "transformVerticalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-maps-" + elementName, last12MonthsLabels, seriesLabels);



  /* 
    Build weekly horizontal bar graphs of search types with absolute numbers.  Relies on the data already being present within:
        allApplicationData.weekSearchTypes.data
        allApplicationData.weekSearchTypes.labels
            OR
        applicationData[appName].weekSearchTypes.data
        applicationData[appName].weekSearchTypes.labels
        
*/
  columnData = chartDataArray.weekSearchTypes.data.slice();
  dataLabels = chartDataArray.weekSearchTypes.labels.slice();
  seriesLabels = [];
  nextChartORef = chartRefs.length;


  //The first entry in the row contains the label used for the data
  chartDataArray.weekSearchTypes.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('weekly-search-' + elementName + '-card',
    cardClassesWeek + " raw",
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Search types for the week</div>' +
    '<button id="weekly-search-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-search-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<button id="weekly-search-' + elementName +
    '-switch-to-per-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">subdirectory_arrow_right</i></button>' +
    '<div class="mdl-tooltip" for="weekly-search-' + elementName + '-switch-to-per-button">Switch to per visit values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-search-' + elementName + '"></div>' +
    '</div>',
    'weekly-search-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);


  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-search-" + elementName, dataLabels, seriesLabels);



  /* 
    Build weekly horizontal bar graphs of search types per visit.  Relies on the data already being present within:
        allApplicationData.weekSearchTypes.dataPerVisit
        allApplicationData.weekSearchTypes.labelsPerVisit
            OR
        applicationData[appName].weekSearchTypes.dataPerVisit
        applicationData[appName].weekSearchTypes.labelsPerVisit
        
*/
  columnData = chartDataArray.weekSearchTypes.dataPerVisit.slice();
  dataLabels = chartDataArray.weekSearchTypes.labelsPerVisit.slice();
  seriesLabels = [];
  nextChartORef = chartRefs.length;


  //The first entry in the row contains the label used for the data
  chartDataArray.weekSearchTypes.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('weekly-search-per-' + elementName + '-card',
    cardClassesWeek + " per-visit hidden",
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Search types per visit for the week</div>' +
    '<button id="weekly-search-per-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-search-per-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<button id="weekly-search-' + elementName +
    '-switch-to-raw-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">subdirectory_arrow_left</i></button>' +
    '<div class="mdl-tooltip" for="weekly-search-' + elementName + '-switch-to-raw-button">Switch to raw values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-search-per-' + elementName + '"></div>' +
    '</div>',
    'weekly-search-per-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-search-per-" + elementName, dataLabels, seriesLabels);


  /* 
  Build yearly vertical stacked bar graphs of search types.  Relies on the data already being present within:
      allApplicationData.yearSearchTypes.data
          OR
      applicationData[appName].yearSearchTypes.data
              
      last12MonthsLabels
      
      */
  columnData = chartDataArray.yearSearchTypes.data.slice();
  nextChartORef = chartRefs.length;
  seriesLabels = [];

  //The first entry in the row contains the label used for the data
  chartDataArray.yearSearchTypes.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('yearly-search-' + elementName + '-card',
    cardClassesTrend,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Search types trend</div>' +
    '<button id="yearly-search-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="yearly-search-' + elementName + '-button">Switch between stacked bar chart and grouped bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-search-' + elementName + '"></div>' +
    '</div>',
    'yearly-search-' + elementName + '-button',
    "transformVerticalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-search-" + elementName, last12MonthsLabels, seriesLabels);



  /* 
    Build weekly horizontal bar graphs of activity types with absolute numbers.  Relies on the data already being present within:
        allApplicationData.weekActivityTypes.data
        allApplicationData.weekActivityTypes.labels
            OR
        applicationData[appName].weekActivityTypes.data
        applicationData[appName].weekActivityTypes.labels
*/
  columnData = chartDataArray.weekActivityTypes.data.slice();
  dataLabels = chartDataArray.weekActivityTypes.labels.slice();
  seriesLabels = [];

  nextChartORef = chartRefs.length;


  //The first entry in the row contains the label used for the data
  chartDataArray.weekActivityTypes.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('weekly-activity-types-' + elementName + '-card',
    cardClassesWeek + " raw",
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Activity types for the week</div>' +
    '<button id="weekly-activity-types-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activity-types-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<button id="weekly-activity-types-' + elementName +
    '-switch-to-per-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">subdirectory_arrow_right</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activity-types-' + elementName + '-switch-to-per-button">Switch to per visit values</div>' +
    '<button id="weekly-activity-types-' + elementName +
    '-switch-to-raw-activities-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">zoom_in</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activity-types-' + elementName + '-switch-to-raw-activities-button">Switch to detailed activity values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-activity-types-' + elementName + '"></div>' +
    '</div>',
    'weekly-activity-types-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activity-types-" + elementName, dataLabels, seriesLabels);


  /* 
  Build weekly horizontal bar graphs of activities per visit.  Relies on the data already being present within:
      allApplicationData.weekActivityTypes.dataPerVisit
      allApplicationData.weekActivityTypes.labelsPerVisit
          OR
          applicationData[appName].weekActivityTypes.dataPerVisit
          applicationData[appName].weekActivityTypes.labelsPerVisit            
  */
  columnData = chartDataArray.weekActivityTypes.dataPerVisit.slice();
  dataLabels = chartDataArray.weekActivityTypes.labelsPerVisit.slice();
  seriesLabels = [];
  nextChartORef = chartRefs.length;

  //The first entry in the row contains the label used for the data
  chartDataArray.weekActivityTypes.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('weekly-activity-types-per-' + elementName + '-card',
    cardClassesWeek + " per-visit hidden",
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Activity types per visit for the week</div>' +
    '<button id="weekly-activity-types-per-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activity-types-per-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<button id="weekly-activity-types-' + elementName +
    '-switch-to-raw-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">subdirectory_arrow_left</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activity-types-' + elementName + '-switch-to-raw-button">Switch to raw values</div>' +
    '<button id="weekly-activity-types-' + elementName +
    '-switch-to-per-activities-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">zoom_in</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activity-types-' + elementName + '-switch-to-per-activities-button">Switch to detailed activity values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-activity-types-per-' + elementName + '"></div>' +
    '</div>',
    'weekly-activity-types-per-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activity-types-per-" + elementName, dataLabels, seriesLabels);




  /* 
    Build weekly horizontal bar graphs of activities with absolute numbers.  Relies on the data already being present within:
        allApplicationData.weekActivities.data
        allApplicationData.weekActivities.labels
            OR
        applicationData[appName].weekActivities.data
        applicationData[appName].weekActivities.labels
        
*/
  columnData = chartDataArray.weekActivities.data.slice();
  dataLabels = chartDataArray.weekActivities.labels.slice();
  seriesLabels = [];
  nextChartORef = chartRefs.length;


  //The first entry in the row contains the label used for the data
  chartDataArray.weekActivities.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('weekly-activities-' + elementName + '-card',
    cardClassesWeek + " details hidden",
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Activity breakdown for the week</div>' +
    '<button id="weekly-activities-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activities-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<button id="weekly-activities-' + elementName +
    '-switch-to-per-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">subdirectory_arrow_right</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activities-' + elementName + '-switch-to-per-button">Switch to per visit values</div>' +
    '<button id="weekly-activities-' + elementName +
    '-switch-to-raw-activity-types-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">zoom_out</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activities-' + elementName + '-switch-to-raw-activity-types-button">Switch to grouped activity type values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-activities-' + elementName + '"></div>' +
    '</div>',
    'weekly-activities-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activities-" + elementName, dataLabels, seriesLabels);


  /* 
    Build weekly horizontal bar graphs of activities per visit.  Relies on the data already being present within:
        allApplicationData.weekActivities.dataPerVisit
        allApplicationData.weekActivities.labelsPerVisit
            OR
        applicationData[appName].weekActivities.dataPerVisit
        applicationData[appName].weekActivities.labelsPerVisit
        
*/
  columnData = chartDataArray.weekActivities.dataPerVisit.slice();
  dataLabels = chartDataArray.weekActivities.labelsPerVisit.slice();
  seriesLabels = [];
  nextChartORef = chartRefs.length;

  //The first entry in the row contains the label used for the data
  chartDataArray.weekActivities.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('weekly-activities-per-' + elementName + '-card',
    cardClassesWeek + " details-per-visit hidden",
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Activity breakdown per visit for the week</div>' +
    '<button id="weekly-activities-per-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activities-per-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<button id="weekly-activities-' + elementName +
    '-switch-to-raw-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">subdirectory_arrow_left</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activities-' + elementName + '-switch-to-raw-button">Switch to raw values</div>' +
    '<button id="weekly-activities-' + elementName +
    '-switch-to-per-activity-types-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">zoom_out</i></button>' +
    '<div class="mdl-tooltip" for="weekly-activities-' + elementName + '-switch-to-per-activity-types-button">Switch to grouped activity type values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-activities-per-' + elementName + '"></div>' +
    '</div>',
    'weekly-activities-per-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activities-per-" + elementName, dataLabels, seriesLabels);



  /* 
    Build yearly vertical stacked bar graphs of activity types.  Relies on the data already being present within:
        allApplicationData.yearActivityTypes.data
            OR
        applicationData[appName].yearActivityTypes.data

        last12MonthsLabels
        
*/
  columnData = chartDataArray.yearActivityTypes.data.slice();
  nextChartORef = chartRefs.length;
  seriesLabels = [];

  //Set-up overall chart
  //The first entry in the row contains the label used for the data
  chartDataArray.yearActivityTypes.data.forEach(function (dataRow) {
    seriesLabels.push(dataRow[0]);
  });


  //Create the DOM element 
  createElement('yearly-activity-types-' + elementName + '-card',
    cardClassesTrend,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Activity types trend</div>' +
    '<button id="yearly-activity-types-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="yearly-activity-types-' + elementName + '-button">Switch between stacked bar chart and grouped bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-activity-types-' + elementName + '"></div>' +
    '</div>',
    'yearly-activity-types-' + elementName + '-button',
    "transformVerticalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-activity-types-" + elementName, last12MonthsLabels, seriesLabels);





  /* 
  Build  yearly browser usage charts.  Relies on the daya already being present within:
      allApplicationData.browserData[browserName]
          OR
      applicationData[appName].browserData[browserName]
      
  */
  columnData = [];
  nextChartORef = chartRefs.length;

  //Map in values for each browser month combination to the series then add to the columnData
  for (var bCounter = 0; bCounter < topBrowsersArray.length; bCounter++) {
    //Create data set
    columnData.push([]);
    //Add name for data set
    columnData[columnData.length - 1].push(topBrowsersArray[bCounter]);
    //add data set to chart column data
    Array.prototype.push.apply(columnData[columnData.length - 1], chartDataArray.browserData[topBrowsersArray[bCounter]]);
  }


  //Create the DOM element 
  createElement('yearly-browsers-' + elementName + '-card',
    cardClassesTrend,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Browser usage trend</div>' +
    '<button id="yearly-browsers-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="yearly-browsers-' + elementName + '-button">Switch between stacked bar chart and grouped bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-browsers-' + elementName + '"></div>' +
    '</div>',
    'yearly-browsers-' + elementName + '-button',
    "transformVerticalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-browsers-" + elementName, last12MonthsLabels, topBrowsersArray);



  /* 
  Build  yearly device usage charts.  Relies on the daya already being present within:
      allApplicationData.deviceCategoryData[category]
          OR
      applicationData[appName].deviceCategoryData[category]
      
  */
  columnData = [];
  nextChartORef = chartRefs.length;

  //Map in values for each browser month combination to the series then add to the columnData
  for (var dcCounter = 0; dcCounter < deviceCategories.length; dcCounter++) {
    //Create data set
    columnData.push([]);
    //Add name for data set
    columnData[columnData.length - 1].push(deviceCategories[dcCounter]);
    //add data set to chart column data
    Array.prototype.push.apply(columnData[columnData.length - 1], chartDataArray.deviceCategoryData[deviceCategories[dcCounter]]);
  }


  //Create the DOM element 
  createElement('yearly-device-category-' + elementName + '-card',
    cardClassesTrend,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Device type trend</div>' +
    '<button id="yearly-device-category-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="yearly-device-category-' + elementName + '-button">Switch between stacked bar chart and grouped bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-device-category-' + elementName + '"></div>' +
    '</div>',
    'yearly-device-category-' + elementName + '-button',
    "transformVerticalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-device-category-" + elementName, last12MonthsLabels, deviceCategories);


  /*
    //Layout the screen with charts
    refreshCharts();
    msnry.layout();*/

  //parentElement.appendChild(docFragment);

  for (var cCounter = 0; cCounter < chartRefs.length; cCounter++) {
    var elId = chartRefs[cCounter].pageElement;

    if (elId.startsWith("yearly-pages-overall")) {
      chartRefs[cCounter].createStackedVerticalBarChart("Percentage of visits");
    } else if (elId.startsWith("weekly-application-users-overall")) {
      chartRefs[cCounter].createStackedVerticalBarChart("Number of visits");
    } else if (elId.startsWith("weekly-users-")) {
      chartRefs[cCounter].createWeekDayAreaChart();
    } else if (elId.startsWith("yearly-users-")) {
      chartRefs[cCounter].createStaticVerticalTwoSeriesBarChart();
    } else if (elId.startsWith("weekly-sessions-")) {
      chartRefs[cCounter].createWeekDayAreaChart();
    } else if (elId.startsWith("visitor-return-")) {
      chartRefs[cCounter].createHorizontalBarChart("Time to return");
    } else if (elId.startsWith("yearly-browsers-")) {
      chartRefs[cCounter].createStackedVerticalBarChart("Percentage of visits");
    } else if (elId.startsWith("yearly-device-category-")) {
      chartRefs[cCounter].createStackedVerticalBarChart("Percentage of visits");
    } else if (elId.startsWith("weekly-maps-")) {
      chartRefs[cCounter].createHorizontalBarChart("Map type");
    } else if (elId.startsWith("yearly-maps-")) {
      chartRefs[cCounter].createStackedVerticalBarChart("Percentage of map types");
    } else if (elId.startsWith("weekly-search-")) {
      chartRefs[cCounter].createHorizontalBarChart("Search type");
    } else if (elId.startsWith("weekly-search-per-")) {
      chartRefs[cCounter].createHorizontalBarChart("Search type");
    } else if (elId.startsWith("yearly-search-")) {
      chartRefs[cCounter].createStackedVerticalBarChart("Percentage of searches");
    } else if (elId.startsWith("weekly-activity-types-")) {
      chartRefs[cCounter].createHorizontalBarChart("Activity type");
    } else if (elId.startsWith("weekly-activity-types-per-")) {
      chartRefs[cCounter].createHorizontalBarChart("Activity type");
    } else if (elId.startsWith("weekly-activities-")) {
      chartRefs[cCounter].createHorizontalBarChart("Activity");
    } else if (elId.startsWith("weekly-activities-per-")) {
      chartRefs[cCounter].createHorizontalBarChart("Activity");
    } else if (elId.startsWith("yearly-activity-types-")) {
      chartRefs[cCounter].createStackedVerticalBarChart("Percentage of activities");
    }

  }

  //refreshCharts();
  //msnry.appended(parentElement.childNodes);

  //Call the Material Design compoment upgrade to make tool-tips work
  componentHandler.upgradeAllRegistered();

  var t1 = performance.now();
  console.log("buildChartsForType elapsed time: " + (t1 - t0) + " milliseconds.");



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
