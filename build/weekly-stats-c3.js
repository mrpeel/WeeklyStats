/*global ASSERT_ENABLED, ASSERT_ERROR, console*/

/** 
 * Simple assertions - checks global variables to decide whether to run and if it runs whether to throw an error or log a console message
        
 */

function assert(condition, message) {
    if (ASSERT_ENABLED && !condition) {

        if (ASSERT_ERROR) {
            throw new Error('Assertion failed' + typeof message === "undefined" ? '' : message);
        } else {
            console.log('Assertion failed');
            console.log(typeof message === "undefined" ? '' : message);
        }
    }
}

/*global window, Promise */

/* Constructor for RateLimitedPromises
 * Params {object} - rateLimitOptions contains an object with the following properties
 *    noRequests, perNumberOfSeconds
 */

var RateLimitedPromises = function (rateLimitOptions) {
    "use strict";

    this.promiseQueue = [];
    if (typeof rateLimitOptions.noRequests === "number") {
        this.maxRequests = rateLimitOptions.noRequests;
    } else {
        //Default to one request per second
        this.maxRequests = 1;
    }
    if (typeof rateLimitOptions.perNumberOfSeconds === "number") {
        this.perNumberOfSeconds = rateLimitOptions.perNumberOfSeconds;
    } else {
        //Default to one request per second
        this.perNumberOfSeconds = 1;
    }

    this.lastQueueExecuteStartTime = 0;

};

/* Adds a promise to the queue
 * Params {Promise} promiseToQueue is the promise which needs to be queued, then calls the processQueue method 
 * Returns {Promise) returns a promise which will resolve when the queued is promsie is executed
 */

RateLimitedPromises.prototype.queuePromise = function (promiseToQueue) {
    "use strict";

    var rateLimitedPromiseConext = this;

    return new Promise(function (resolve, reject) {
        rateLimitedPromiseConext.promiseQueue.push({
            resolve: resolve,
            reject: reject,
            promise: promiseToQueue
        });

        rateLimitedPromiseConext.processQueue();
    });


};

/* Processes the queue and if the time is correct, calls the executePromiseFromQueue method.
 * If the time is not ready to process the next execution, processQueue calls itself to process again at the next expected interval
 * Params {none}
 * Returns {none)
 */
RateLimitedPromises.prototype.processQueue = function () {
    "use strict";

    var rateLimitedPromiseConext = this;

    var inc = (rateLimitedPromiseConext.perNumberOfSeconds / rateLimitedPromiseConext.maxRequests) * 1000,
        elapsed = Date.now() - rateLimitedPromiseConext.lastQueueExecuteStartTime;

    if (rateLimitedPromiseConext.promiseQueue.length > 0) {
        if (elapsed >= inc) {
            rateLimitedPromiseConext.executePromiseFromQueue();
        } else {
            window.setTimeout(function () {
                rateLimitedPromiseConext.processQueue();
                //Reschedule for difference between current date time and expected date time for next execution - add 50 ms to allow for execution time
            }, inc - elapsed + 50);
        }

    }

};

/* Executes the next promise from the queue.  Once it has resolved or rejected, the result is resolved / rejected through to the promise 
 * which was returned as part of the queuePromise method.
 * Params {none}
 * Returns {none)
 */
RateLimitedPromises.prototype.executePromiseFromQueue = function () {
    "use strict";

    var rateLimitedPromiseConext = this;

    if (rateLimitedPromiseConext.promiseQueue.length > 0) {

        rateLimitedPromiseConext.lastQueueExecuteStartTime = Date.now();

        var promiseToExecute = rateLimitedPromiseConext.promiseQueue.shift();
        promiseToExecute.promise().then(function (r) {
            promiseToExecute.resolve(r);
        }).catch(function (r) {
            promiseToExecute.reject(r);
        });
    }
};


/* Resets the queue.  This is useful when a user request invalidates all queued requests and new requests need to be queued.
 * Params {none}
 * Returns {none)
 */
RateLimitedPromises.prototype.clearQueue = function () {
    "use strict";

    var rateLimitedPromiseConext = this;
    rateLimitedPromiseConext.promiseQueue.length = 0;

};

/** 
 * Class to encapsulate calls to Google Analytics API - relies on ratelimitpromises.js to control the rate of calls to GA
 */

/*global window, RateLimitedPromises, Promise, gapi, console */

/** 
 * Constructor for GA Request class
 * @param {Number} The rate limit which should be applied to calls to the Googla Analytics API (set by Google for a given API key)

 */
var GARequests = function (ratePerSecond) {
    "use strict";

    //Create a rate limited promise object
    this.rateLimitedPromises = new RateLimitedPromises({
        noRequests: ratePerSecond,
        perNumberOfSeconds: 1
    });

};

/**
 * Extend the Embed APIs `gapi.analytics.report.Data` component to
 * return a promise the is fulfilled with the value returned by the API.
 * @param {Object} queryParams The request parameters.  Params should be an object in the following format:
        {
        'ids': {gaIds value},
        'metrics': {ga Metrics expression},
        'start-date': {Start Date in YYYY-MM-DD format},
        'end-date': {End Date (inclusive) in YYYY-MM-DD format},
        'dimensions': {ga Dimensions expression - if required},
        'sort': {ga Sort expression - if required},
        'max-results': {Max no results - if required}
        }
 * @return {Rows or Null} For succesfull execution the rows are returned from GA.  For a failure, null is returned.
 */
GARequests.prototype.queryGA = function (queryParams) {
    "use strict";

    var gaRequestsContext = this;

    return new Promise(function (resolve, reject) {

        var gaQueryPromise = function () {
            return new Promise(function (resolve, reject) {
                var data = new gapi.analytics.report.Data({
                    query: queryParams
                });

                data.once('success', function (response) {
                        resolve(response);
                    })
                    .once('error', function (response) {
                        reject(response);
                    })
                    .execute();
            });
        };

        gaRequestsContext.rateLimitedPromises.queuePromise(gaQueryPromise).then(function (gaResult) {
            if (gaResult.totalResults > 0) {
                resolve({
                    columHeaders: gaResult.columnHeaders,
                    rows: gaResult.rows
                });
            } else {
                resolve(null);
            }
        }).catch(function (err) {
            reject(err);
        });
    });
};

/**
 * Remove all currently queued promises.  Used when the user changes the time period with requests for the old time period already queued.  All queued requests will become
 *   invalid when the time period changes, so the queue needs to be cleared as the first action.
 * @param {None} 
 * @return {None} 
 */
GARequests.prototype.clearQueryQueue = function (queryParams) {
    "use strict";

    this.rateLimitedPromises.clearQueue();
};

/*global c3, strokeColors, barFillColors, sequentialFillColors, d3, window, document, currentWeekJSON, previousWeekJSON, previousYearJSON, MonthlyDataJSON, visitorReturnJSON */
/*global console, visitorReturnJSONDesc, visitorReturnDiscrete, reverseSequentialFillColors, colorbrewer, searchTypeDiscreteJSON, quarterleyPageUsageJSON*/

/** 
 * General chart class containing the common data and methods 
 * required to draw a vertical bar, horiztonal bar and area chart 
 */
var C3StatsChart = function (columnData, pageElement, labels, seriesLabels) {
    "use strict";

    this.columnData = columnData;

    //Populate label data if supplied
    if (typeof labels !== "undefined") {
        this.labels = labels;
        this.groupValues = labels;

    } else {
        this.labels = [];
    }

    //Populate series labels if supplied
    if (typeof seriesLabels !== "undefined") {
        this.seriesLabels = seriesLabels;
        this.groupValues = seriesLabels;
    } else {
        this.seriesLabels = [];
    }

    this.chartFormat = "";
    this.chartType = "";
    this.chartMaxIndValue = 0;
    this.chartMaxTotalValue = 0;
    this.barOrArea = "";
    this.pageElement = pageElement;
    this.horizontalLabelClassName = "";
    this.transitionDuration = 1000;
};


/**
 * Create a new a area chart for week days.  This expects data in the following format:
 *   [
 *      ['x', '2015-09-28', '2015-09-29', '2015-09-30', '2015-10-01', '2015-10-02', '2015-10-03', '2015-10-04'] - the exact dates should be for the current week
 *      ["Week starting 21/09/2015", 1663, 1728, 1638, 1657, 1397, 332, 292]
 *      ["Week starting 28/09/2015", 1734, 1781, 1733, 1650, 1481, 281, 298]
 *      ["Median for the last year", 1585, 1606, 1560, 1553, 1363, 294, 283]
 *   ]
 *
 * @param {None}
 * @return {None}
 */
C3StatsChart.prototype.createWeekDayAreaChart = function () {
    "use strict";

    //capture execution context to enable usage within functions
    var statsChartContext = this;

    statsChartContext.chartFormat = "WeekDayAreaChart";
    statsChartContext.chartType = "area-spline";

    statsChartContext.chart = c3.generate({
        bindto: document.getElementById(statsChartContext.pageElement),
        transition: {
            duration: statsChartContext.transitionDuration
        },
        padding: {
            left: 75,
            bottom: 20,
            right: 20,
            top: 20
        },
        point: {
            r: 4
        },
        data: {
            x: 'x',
            columns: statsChartContext.columnData,
            type: 'area-spline'
        },
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    format: '%a',
                    outer: false,
                    centered: false
                }


            },
            y: {
                padding: {
                    left: 0
                },
                tick: {
                    format: function (d) {
                        if ((d / 1000) >= 10) {
                            d = d / 1000 + "K";
                        }
                        return d;
                    }
                }
            }

        },
        grid: {
            x: {
                show: true
            },
            y: {
                show: true
            },
            focus: {
                show: true
            }
        },
        area: {
            zerobased: true
        },
        color: {
            pattern: chartColors.smallSets[3]
        },
        bar: {
            width: {
                ratio: 0.85 // this makes bar width 85% of length between ticks
            }
        }

    });
};

/**
 * Create a new a statical vertical bar chart.  This will create a bar chart with 2 data series which is not suitable to be transformed.  This expects data in the following format:
 *    [
 *      ["Current year", 13243, 14474, 16500, 16177, 16947, 16041, 17965, 17542, 17241, 2139]
 *      ["Previous year", 0, 0, 0, 0, 0, 0, 0, 228, 7343, 10137, 13360, 11783]
 *    ]
 *
 * @param {None}
 * @return {None}
 */

C3StatsChart.prototype.createStaticVerticalTwoSeriesBarChart = function () {
    "use strict";

    //capture execution context to enable usage within functions
    var statsChartContext = this;

    statsChartContext.chartFormat = "StaticVerticalTwoSeriesBarChart";

    statsChartContext.chart = c3.generate({
        bindto: document.getElementById(statsChartContext.pageElement),
        transition: {
            duration: statsChartContext.transitionDuration
        },
        padding: {
            left: 75,
            bottom: 20,
            right: 20,
            top: 20
        },
        point: {
            r: 4
        },
        data: {
            columns: statsChartContext.columnData,
            type: 'bar',
        },
        axis: {
            x: {
                type: 'category',
                categories: statsChartContext.labels,
                padding: {
                    left: 0,
                    right: 0,
                },
                tick: {
                    centered: true,
                    outer: false,
                    fit: false,
                    count: statsChartContext.labels.length,
                    width: 500
                }

            },
            y: {
                padding: {
                    left: 0
                },
                tick: {
                    format: function (d) {
                        if ((d / 1000) >= 10) {
                            d = d / 1000 + "K";
                        }
                        return d;
                    }
                }

            }

        },
        grid: {
            x: {
                show: true
            },
            y: {
                show: true
            },
            focus: {
                show: true
            }
        },
        bar: {
            width: {
                ratio: 0.85 // this makes bar width 85% of length between ticks
            }
        },
        color: {
            pattern: chartColors.smallSets[2]
        }
    });
};

/**
 * Create a new a stacked vertical bar chart to represent percentages.  The data should add up to 100 for each time period.  This expects data in the following format:
            [
                ["LASSI", 72.68, 63.41, 61.86, 63.36, 62.09, 63.02, 61.93, 62.6, 61.61, 61.91, 61.79, 62.32],
                ["LASSI - TPI", 4.25, 12.5, 13.81, 13.23, 13.9, 12.6, 14.05, 14.57, 15.09, 14.67, 15.26, 16.26],
                ["SMES", 17.04, 14.01, 13.73, 13.27, 13.09, 13.45, 12.98, 12.41, 11.84, 12.09, 12.04, 10.48],
                ["LASSI - SPEAR", 2.84, 7.07, 6.64, 7.15, 7.49, 7.55, 7.48, 7.15, 7.61, 7.91, 7.41, 7.32],
                ["VICNAMES", 3.19, 3.01, 3.96, 3, 3.43, 3.38, 3.56, 3.27, 3.85, 3.42, 3.5, 3.62]
            ]
 *
 * Labels should be in this format:
         ["Nov-14", "Dec-14", "Jan-15", "Feb-15", "Mar-15", "Apr-15", "May-15", "Jun-15", "Jul-15", "Aug-15", "Sep-15", "Oct-15"],
 *
 * Series labels should be in this format:
         ["LASSI", "LASSI - TPI", "SMES", "LASSI - SPEAR", "VICNAMES"]
 *
 * Note that the data series name and label includes the raw number and percentage 
 *
 *
 * @param {None}
 * @return {None}
 */

C3StatsChart.prototype.createStackedVerticalBarChart = function (verticalAxisLabel) {
    "use strict";

    //capture execution context to enable usage within functions
    var statsChartContext = this;

    statsChartContext.chartFormat = "StackedVerticalBarChart";
    statsChartContext.chartType = "grouped";

    var chartHeight = statsChartContext.columnData.length * 15;
    if (chartHeight < 350) {
        chartHeight = 350;
    }


    var chartWidth;
    if (document.getElementById(statsChartContext.pageElement)) {
        chartWidth = document.getElementById(statsChartContext.pageElement).clientWidth;
    } else {
        chartWidth = 500;
    }


    statsChartContext.chart = c3.generate({
        bindto: document.getElementById(statsChartContext.pageElement),
        transition: {
            duration: statsChartContext.transitionDuration
        },
        padding: {
            bottom: 20,
            left: 75,
            right: 20,
            top: 20
        },
        size: {
            height: chartHeight,
            width: chartWidth
        },
        data: {
            columns: statsChartContext.columnData,
            type: 'bar',
            groups: [statsChartContext.seriesLabels],
            order: 'asc'
        },
        axis: {
            x: {
                type: 'category',
                categories: statsChartContext.labels,
            },
            y: {
                label: {
                    text: verticalAxisLabel || '',
                    position: 'outer-middle',
                },
                padding: {
                    top: 0
                },
                tick: {
                    format: function (d) {
                        if ((d / 1000) >= 10) {
                            d = d / 1000 + "K";
                        }
                        return d;
                    }
                }

            }

        },
        grid: {
            x: {
                show: true
            },
            y: {
                show: true,
                max: 100,
                padding: {
                    top: 0,
                    bottom: 0
                }
            },
            focus: {
                show: true
            }
        },
        bar: {
            width: {
                ratio: 0.95 // this makes bar width 98% of length between ticks
            }
        },
        tooltip: {
            grouped: true
        },
        color: {
            pattern: chartColors.bigSets[20]
        },
        onresized: function () {
            //When window is resized, re-size the chart appropriately
            var resizeWidth;
            if (document.getElementById(statsChartContext.pageElement)) {
                resizeWidth = document.getElementById(statsChartContext.pageElement).clientWidth;
            } else {
                resizeWidth = 500;
            }
            statsChartContext.chart.resize({
                height: chartHeight,
                width: resizeWidth
            });
        }

    });
};

/**
 * Create a new a horiztonal bar chart.  This expects data in the following format:
 *    [
 *            ["Within a month: 38680 (30%)", 38680],
 *            ["Within a day: 38180 (30%)", 38180],
 *            ["Within a week: 33197 (26%)", 33197],
 *            ["Within a year: 17290 (14%)", 17290]
 *    ]
 *
 * Labels should be in this format:
         ["Within a month: 38680 (30%)", "Within a day: 38180 (30%)", "Within a week: 33197 (26%)", "Within a year: 17290 (14%)"],
 *
 * Note that the data series name and label includes the raw number and percentage 
 *
 * @param {verticalAxisLabel} The label to put on the vertical axis
 * @return {None}
 */

C3StatsChart.prototype.createHorizontalBarChart = function (verticalAxisLabel) {
    "use strict";

    //capture execution context to enable usage within functions
    var statsChartContext = this;

    statsChartContext.chartFormat = "HorizontalBarChart";
    statsChartContext.chartType = "individual";
    statsChartContext.verticalAxisLabel = verticalAxisLabel;

    //Reset numeric values
    statsChartContext.chartMaxIndValue = 0;
    statsChartContext.chartMaxTotalValue = 0;

    var chartClasses = {};
    var chartHeight = statsChartContext.columnData.length * 50;
    if (chartHeight < 350) {
        chartHeight = 350;
    }

    var chartWidth;
    if (document.getElementById(statsChartContext.pageElement)) {
        chartWidth = document.getElementById(statsChartContext.pageElement).clientWidth;
    } else {
        chartWidth = 500;
    }

    //Calculate the maximum individual and total values - required for re-scaling the chart
    statsChartContext.columnData.forEach(function (valArray) {
        valArray.forEach(function (val) {
            //If value is a number, add to total and check for max
            if (typeof val === 'number') {
                statsChartContext.chartMaxTotalValue = statsChartContext.chartMaxTotalValue + val;

                if (val > statsChartContext.chartMaxIndValue) {
                    statsChartContext.chartMaxIndValue = val;
                }
            }
        });
    });

    //Set the class name which will be used to identify the labels as horiztonal 
    statsChartContext.horizontalLabelClassName = "horizontal-label-position";

    //Prepare the horizontal label class for each data series
    statsChartContext.columnData.forEach(function (val) {
        chartClasses[val[0]] = statsChartContext.horizontalLabelClassName;
    });

    statsChartContext.chart = c3.generate({
        bindto: document.getElementById(statsChartContext.pageElement),
        transition: {
            duration: statsChartContext.transitionDuration
        },
        size: {
            height: chartHeight,
            width: chartWidth
        },
        padding: {
            bottom: 20,
            left: 130,
            right: 20,
            top: 20
        },
        data: {
            columns: statsChartContext.columnData,
            type: 'bar',
            labels: {
                format: function (v, id, i, j) {
                    return statsChartContext.labels[j];
                }
            },
            classes: chartClasses
        },
        axis: {
            rotated: true,

            x: {
                type: 'category',
                categories: [verticalAxisLabel],
                padding: {
                    left: 0,
                    right: 0,
                },
                tick: {
                    count: 0
                }

            },
            y: {
                padding: {
                    left: 0
                },
                tick: {
                    format: function (d) {
                        if ((d / 1000) >= 10) {
                            d = d / 1000 + "K";
                        }
                        return d;
                    }
                }

            }

        },
        grid: {
            x: {
                show: true
            },
            y: {
                show: true
            },
            focus: {
                show: true
            }
        },
        bar: {
            width: {
                ratio: 0.95 // this makes bar width 95% of length between ticks
            }
        },
        tooltip: {
            grouped: true
        },
        color: {
            pattern: chartColors.bigSets[20]
        },
        onrendered: function () {
            //Move the labels into position
            statsChartContext.moveLabelsXPos();
        },
        onresized: function () {
            //When window is resized, re-size the chart appropriately
            var resizeWidth;
            if (document.getElementById(statsChartContext.pageElement)) {
                resizeWidth = document.getElementById(statsChartContext.pageElement).clientWidth;
            } else {
                resizeWidth = 500;
            }
            statsChartContext.chart.resize({
                height: chartHeight,
                width: resizeWidth
            });
        }


    });

    statsChartContext.rescaleHorizontal(statsChartContext.chartMaxIndValue * 0.85);
};


/** 
 * Transform a horizontal chart from stacked -> grouped or grouped -> stacked
 * @param {number} newMaxValue The new maximum value which should be used to ensure the correct scale.
 * @return {None}
 */
C3StatsChart.prototype.refreshChartData = function (columnData, labels, seriesLabels) {
    "use strict";

    var statsChartContext = this;


    //Refresh column data - all charts have column data
    statsChartContext.columnData = columnData;

    //Refresh label data if supplied
    if (typeof labels !== "undefined") {
        statsChartContext.labels = labels;
        statsChartContext.groupValues = labels;
    }

    //Refresh series labels if supplied
    if (typeof seriesLabels !== "undefined") {
        statsChartContext.seriesLabels = seriesLabels;
        statsChartContext.groupValues = seriesLabels;
    }

    if (statsChartContext.chartFormat === "WeekDayAreaChart") {
        statsChartContext.createWeekDayAreaChart();
    } else if (statsChartContext.chartFormat === "StaticVerticalTwoSeriesBarChart") {
        statsChartContext.createStaticVerticalTwoSeriesBarChart();
    } else if (statsChartContext.chartFormat === "StackedVerticalBarChart") {
        statsChartContext.createStackedVerticalBarChart();
    } else if (statsChartContext.chartFormat === "HorizontalBarChart") {
        statsChartContext.createHorizontalBarChart(statsChartContext.verticalAxisLabel);
    }


};

/** 
 * Transform a horizontal chart from stacked -> grouped or grouped -> stacked
 * @param {number} newMaxValue The new maximum value which should be used to ensure the correct scale.
 * @return {None}
 */
C3StatsChart.prototype.transformHorizontalStackedGrouped = function () {
    "use strict";

    var statsChartContext = this;

    if (statsChartContext.chartType === "individual") {
        statsChartContext.chart.groups([statsChartContext.groupValues]);
        statsChartContext.rescaleHorizontal(statsChartContext.chartMaxTotalValue * 0.95);
        statsChartContext.chartType = "grouped";
    } else {
        statsChartContext.chart.groups([]);
        statsChartContext.rescaleHorizontal(statsChartContext.chartMaxIndValue * 0.85);
        statsChartContext.chartType = "individual";
    }
};

/** 
 * Transform a vertical chart from stacked -> grouped or grouped -> stacked
 * @param {None}
 * @return {None}
 */
C3StatsChart.prototype.transformVerticalStackedGrouped = function () {
    "use strict";

    var statsChartContext = this;

    if (statsChartContext.chartType === "individual") {
        statsChartContext.chart.groups([statsChartContext.groupValues]);
        statsChartContext.chartType = "grouped";
    } else {
        statsChartContext.chart.groups([]);
        statsChartContext.chartType = "individual";
    }

};

/** 
 * Transform a bar chart -> area chart or garea chart -> bar
 * @param {None}
 * @return {None}
 */
C3StatsChart.prototype.transformAreaBar = function () {
    "use strict";

    var statsChartContext = this;

    if (statsChartContext.chartType === "area-spline") {
        statsChartContext.chart.transform('bar');
        statsChartContext.chartType = "bar";
    } else {
        statsChartContext.chart.transform('area-spline');
        statsChartContext.chartType = "area-spline";
    }
};


/** 
 * Reset the label position.  This is used for Horiztonal bar charts.  It moves the labels to the left and makes them black.  This allows data to be 
 *    viewed more easily.
 * @param {None}
 * @return {None}
 */
C3StatsChart.prototype.moveLabelsXPos = function () {
    "use strict";

    var statsChartContext = this;

    if (statsChartContext.chartType === "individual") {
        //Move all labels to left and set text to black
        window.setTimeout(function () {

            d3.selectAll("div#" + statsChartContext.pageElement + " .c3-target-" + statsChartContext.horizontalLabelClassName + " .c3-text").attr("x", 15).style({
                fill: "black",
                opacity: 1
            });

        }, 1500);
    } else {
        //Set text to transparent
        window.setTimeout(function () {

            d3.selectAll("div#" + statsChartContext.pageElement + " .c3-target-" + statsChartContext.horizontalLabelClassName + " .c3-text").style({
                opacity: 0
            });

        }, 1500);
    }
};

/** 
 * Rescale the horiztonal axis (it is listed as the y axis because the horiztonal chart is a rotated version of a vertical chart).  Because labels are initially put to the 
 *   right of the data,  the scale displayed is incorrect.  After the labels have been moved, the chart needs to be re-scaled to make use of the extra room.
 * @param {number} maxValue - the maximum value to set the scale to
 * @return {None}
 */
C3StatsChart.prototype.rescaleHorizontal = function (maxValue) {
    "use strict";

    var statsChartContext = this;

    window.setTimeout(function () {
        statsChartContext.chart.axis.max({
            y: maxValue
        });
    }, 0);
};




var chartColors = {
    bigSets: {
        13: ["#92E5F7", "#F3AB67", "#FABDE5", "#BCE385", "#AAB591", "#FFA3A8", "#9EF1B3", "#FEF4A3", "#C8E1FF", "#BAF6F0",
            "#FBBCBD", "#EEA8B5", "#AFD0F1"
        ],
        14: ["#FF998E", "#89F1F5", "#C5CA69", "#D3C8F5", "#7BD39A", "#F49CC0", "#E9FFE5", "#F9A667", "#88C4E5", "#A1BEA7",
            "#ACBB7F", "#DEF0A2", "#9AB8CB", "#B1C0ED"
        ],
        15: ["#D1DDF3", "#F6BF63", "#89C593", "#F9B7A9", "#F3F4D1", "#5CC5C2", "#C9D17B", "#C0FBF2", "#FCB1CD", "#CBF8B1",
            "#B4ACB9", "#F7DBA4", "#7FE4F4", "#DAA37E", "#D2C7F2"
        ],
        16: ["#B0D2FE", "#EDCB65", "#F2989C", "#8EFCE5", "#AADC8D", "#E6E4DA", "#FACDA0", "#D19EC3", "#B1C292", "#5BC6B5",
            "#CBF6BE", "#ADBBD2", "#DDA37A", "#C0BF5F", "#FEE78C", "#F3B9D3"
        ],
        17: ["#8DE5E1", "#F4A1AA", "#B8CC6E", "#C0BBE1", "#90EEAF", "#D0AC72", "#FFDAC9", "#DBE5EC", "#CCFACF", "#A8B37E",
            "#FBC1E0", "#87B9AB", "#F9DC98", "#BBF9A3", "#D3AFA6", "#76F4CA", "#F8ADB2"
        ],
        18: ["#72CBCA", "#FBC06D", "#D8AEDE", "#BAEBA2", "#EAD9C1", "#F49C83", "#C3D56C", "#80FFE6", "#6DBE87", "#C6AEB3",
            "#EFF0AE", "#BDAE8C", "#D5EFCC", "#F0D190", "#FAD3F5", "#FEEFE9", "#96C989", "#D2B9E9"
        ],
        19: ["#76F6E3", "#EEB965", "#D4B4E2", "#C9F69B", "#B4B498", "#FEABB4", "#92B1BB", "#EDD8D6", "#81C98E", "#F3EFB0",
            "#A7CCF5", "#E3A075", "#C1F6DC", "#68C5B4", "#E6D572", "#FFC590", "#E0FBBB", "#C4AF8E", "#F5DD86"
        ],
        20: ["#C6E793", "#F39187", "#A0BCD5", "#6FD1B5", "#FACD8C", "#F8DAE1", "#B0F6F6", "#FDA06C", "#E8E775", "#B3B5B1",
            "#C5A880", "#C5BF6F", "#DBA29B", "#B2E9BD", "#FACFAB", "#91C481", "#E3A967", "#FFABAC", "#C8CCE9", "#AAD77A"
        ]
    },
    smallSets: {
        2: ["#f57366", "#afe064"],
        3: ["#72a1cb", "#f57366", "#afe064"]

    }
};

/*global window, GARequests, console, Promise, assert, buildWeeklyUsersCharts, buildYearlyUsersCharts, buildWeeklySessionCharts, buildYearlyBrowserCharts, buildYearlyPagesChart*/
/*global buildVisitorReturnCharts, buildWeekSearchTypes, buildWeekPerVisitSearchTypes, buildYearSearchTypes, buildWeekMapTypes, buildYearMapTypes */
/*global buildWeekActivities, buildWeekPerVisitActivities, buildWeekActivityTypes, buildWeekPerVisitActivityTypes, buildYearActivities, buildYearActivityTypes*/
/*global showHomeScreen, hideLoadBar, loadSubPage, disableAllLinks, updateScreenDateSelection */

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
var APP_NAMES = ["LASSI - Land and Survey Spatial Information", "LASSI - SPEAR", "SMES - Survey Marks Enquiry Service", "VICNAMES - The Register of Geographic Names",
                 "LASSI - TPC", "LASSI - VMT"];
var APP_LABELS = ["LASSI", "LASSI - SPEAR", "SMES", "VICNAMES", "LANDATA TPI", "LANDATA VMT"];
var MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

//Categorise for UI activities
var clickLookupCategories = [
  {
    event_labels: ['Clear Highlight', 'Polygon Search. Enabled when zoom scale is 1:10,000 or below.', 'View Search Results'],
    caption: "Search"
},
  {
    event_labels: ['Pan: Drag cursor or hold shift key and drag cursor to zoom', 'Zoom In', 'Zoom Out', 'Zoom to Full Extent',
                                                        'Zoom to Greater Melbourne', 'Zoom to Scale', 'Go back one page', 'Go forward one page'],
    caption: "Move and zoom"
},
  {
    event_labels: ['Historical Information', 'Identify Aerial Photograph', 'Identify Property', 'Identify Survey Labels',
                                    'Identify Survey Marks', 'Parcel information: click on map', 'Identify Feature',
                                   'Identify Road. Enabled when zoom scale is 1:50,000 or below.', 'Polygon Search. Enabled when zoom scale is 1:10,000 or below.',
                                   'View Search Results'],
    caption: "Retrieve information"
},
  {
    event_labels: ['Add Mark to selection', 'Clear Selection List', 'Remove Mark from selection', 'Display Mark Selection List Window'],
    caption: "Select & display marks"
    },
  {
    event_labels: ['Select Parcel', 'Unselect Parcel', 'Complete Selection'],
    caption: "Map based select"
    },
  {
    event_labels: ['Markup tools', 'Measure Area', 'Measure Distance', 'Clear highlight'],
    caption: "Map tools"
    },
  {
    event_labels: ['Save Geo-Referenced Image', 'Save Image'],
    caption: "Save image"
    },
  {
    event_labels: ['Print Map'],
    caption: "Print map"
    },
  {
    event_labels: ['Activate Document Download Tab', 'Draw Polygon to Export Survey Information to LandXML', 'Downoad GNR Data', 'Export property information',
                       'Export Parcels', 'Open in Google Maps', 'Street View: click on map'],
    caption: "Download and export information"
    },
  {
    event_labels: ['Add Labels', 'Administration', 'Administrator functions', 'Broadcast Message', 'Delete Labels', 'Edit Labels',
                                                        'Check update', 'Mark Maintenance', 'Add New GNR Record'],
    caption: "Administer data"
    }
];

var topPagesFilter;
var topBrowsersArray = [];
var topBrowsersFilter;
var startDate, endDate, ids;
var lastWeekStartDate, lastWeekEndDate;
var lastYearStartDate, lastYearEndDate;
var previousYearStartDate, previousYearEndDate;
var retrievalId;

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
     Accept a date and GA id.  Convert the date to start / end date for the working week (Mon - Sun) and store the date period and GA id, then start the data retrieval process.
    * @param {string or date} - selectedDate - the date for the comparison period as a date or date string 
    * @param {string} - sIds - the Google Aanalytics id string
*/
function setupRetrieval(selectedDate, sIds) {
  "use strict";

  assert(isDate(selectedDate), 'setupRetrieval assert failed - selectedDate: ' + selectedDate);
  assert(sIds !== "", 'setupRetrieval assert failed - sIds empty');

  //Update the GA id
  ids = sIds;

  //Start the data retrieval process with the date
  changeRetrievalDate(selectedDate);

}

/**
     Accept a new date and update the date period if required.
    * @param {string or date} - selectedDate - the date for the comparison period as a date or date string 
*/
function changeRetrievalDate(newDate) {
  "use strict";

  assert(isDate(newDate), 'changeRetrievalDate assert failed - newDate: ' + newDate);

  var dayOfWeek = new Date(newDate).getDay();

  //Use dayofweek to set the correct Monday 
  //because Sunday is the last day of the working week all day values should be shifted back -1
  dayOfWeek--;

  if (dayOfWeek === -1) {
    dayOfWeek = 6;
  }

  var newStartDate = dateAdd(newDate, "d", (dayOfWeek * -1));

  //check if this date change has alrtered the time period - if so, update the time period and retrieve the data
  if (!startDate || startDate !== newStartDate) {
    startDate = newStartDate;
    endDate = dateAdd(startDate, "d", 6);
    retrieveData();
    updateScreenDateSelection(startDate);
  }
}

/**
     Work out what the last complete work was from today
    * @return {date} - The last full week (Mon - Sun)
*/
function returnLastFullWeekDate() {
  "use strict";

  var todaysDate = new Date();

  //If the day of week is a Sunday, the return current week, otherwise return the previous week
  if (todaysDate.getDay() === 0) {
    return todaysDate;
  } else {
    return dateAdd(todaysDate, "d", -7);
  }

}

/** 
 * Run the data retrieval process 
 */

function retrieveData() {
  "use strict";

  assert(isDate(startDate), 'retrieveData assert failed - startDate: ' + startDate);
  assert(new Date(startDate).getDay() === 1, 'retrieveData assert failed - startDate is not Monday: ' + startDate);
  assert(isDate(endDate), 'retrieveData assert failed - endDate: ' + endDate);
  assert(new Date(endDate).getDay() === 0, 'retrieveData assert failed - endDate is not Sunday: ' + endDate);
  assert(ids !== "", 'retrieveData assert failed - ids empty');



  console.time("dataLoad");

  //Record the timestamp as a retrieval Id
  retrievalId = Date.now();

  //Store the local copy of the retrieval Id
  var localId = retrievalId;

  //Make sure the queue has been emptied
  gaRequester.clearQueryQueue();

  disableAllLinks();

  //Set date and page filters
  setDates();
  setPages();


  //Start retrieval process
  retrieveTopBrowsers(5)
    .then(function () {
      //Check that this data retrieval is still the current retrieval.  If not, return false and move on.
      if (localId === retrievalId) {
        return retrieveYearlyPages();
      } else {
        return false;
      }
    })
    .then(function () {
      if (localId === retrievalId) {
        return retrieveWeeklyUsers();
      } else {
        return false;
      }
    })
    .then(function () {
      //If on home screen then call loader function
      if (localId === retrievalId) {
        loadSubPage("home");
        //Make sure to disable the links again 
        disableAllLinks();
        return true;
      } else {
        return false;
      }
    })
    .then(function () {
      if (localId === retrievalId) {
        return retrieveYearlyUsers();
      } else {
        return false;
      }
    })
    .then(function () {
      if (localId === retrievalId) {
        return retrieveWeeklySessions();
      } else {
        return false;
      }
    })
    .then(function () {
      if (localId === retrievalId) {
        return retrieveYearlyBrowsers();
      } else {
        return false;
      }
    })
    .then(function () {
      if (localId === retrievalId) {
        return retrieveVisitorReturns();
      } else {
        return false;
      }
    })
    .then(function () {
      if (localId === retrievalId) {
        return retrieveTotalVisits();
      } else {
        return false;
      }
    })
    .then(function () {
      if (localId === retrievalId) {
        return retrieveSearchTypes();
      } else {
        return false;
      }
    })
    .then(function () {
      if (localId === retrievalId) {
        return retrieveMapTypes();
      } else {
        return false;
      }
    })
    .then(function () {
      if (localId === retrievalId) {
        return retrieveActivities();
      } else {
        return false;
      }
    })
    .then(function () {
      loadSubPage("specific");
      hideLoadBar();
      console.timeEnd("dataLoad");
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
  //If current year is a leap year and period happens to start on Feb 29, subtracting 1 year will give last year's period 
  //  as ending on the 1st Mar rather than 28 Feb - this happened in 2016 and the monthly calculations got confused 
  //  reporting 13 months rather than 12

  if (lastYearEndDate.getDate() === 29 && lastYearEndDate.getMonth() === 1) {
    previousYearEndDate = dateAdd(previousYearEndDate, "d", -1);
  }

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

    allApplicationData.pageData = {};
    allApplicationData.pageTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    APP_NAMES.forEach(function (appName) {
      allApplicationData.pageData[appName] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    });

    gaRequester.queryGA({
      "start-date": formatDateString(lastYearStartDate, "query"),
      "end-date": formatDateString(lastYearEndDate, "query"),
      "ids": ids,
      "metrics": "ga:pageviews",
      "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth",
      "filters": topPagesFilter,
      "sort": "ga:pageTitle,ga:yearMonth"
    }).then(function (results) {


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
          allApplicationData.pageTotals[+dataRow[2]] += (+dataRow[3]);
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

    var appName;

    //Set-up base values for current week user data
    allApplicationData.currentWeekUserData = [0, 0, 0, 0, 0, 0, 0];

    for (appName in applicationData) {
      applicationData[appName].currentWeekUserData = [0, 0, 0, 0, 0, 0, 0];
    }

    //Set-up base values for last week user data
    allApplicationData.lastWeekUserData = [0, 0, 0, 0, 0, 0, 0];

    for (appName in applicationData) {
      applicationData[appName].lastWeekUserData = [0, 0, 0, 0, 0, 0, 0];
    }

    //Set up empty arrays for each day of the week for last year median data
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

    gaRequester.queryGA({
      "start-date": formatDateString(startDate, "query"),
      "end-date": formatDateString(endDate, "query"),
      "ids": ids,
      "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
      "metrics": "ga:users",
      "filters": topPagesFilter,
      "sort": "ga:pageTitle,ga:date"
    }).then(function (results) {

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
          allApplicationData.currentWeekUserData[+dataRow[2]] += (+dataRow[3]);
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
          allApplicationData.lastWeekUserData[+dataRow[2]] += (+dataRow[3]);
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
          for (var dataCounter = 0; dataCounter < applicationData[appName].lastYearUserData.length; dataCounter++) {
            var arrLength = applicationData[appName].lastYearUserData[dataCounter].length;
            var dataRow = applicationData[appName].lastYearUserData[dataCounter];

            //Re-sort array into numeric order
            sortNumericalArrayAsc(dataRow);

            //Choose middle array value (median)
            applicationData[appName].lastYearMedianUserData[dataCounter] = dataRow[Math.round(arrLength / 2)] || 0;
            //Add median value for this application to the overall median value
            allApplicationData.lastYearMedianUserData[dataCounter] += (dataRow[Math.round(arrLength / 2)] || 0);
          }

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
  assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveYearlyUsers assert failed - topPagesFilter: ' + topPagesFilter);


  return new Promise(function (resolve, reject) {
    var appName;
    //Set-up base values for current year data
    allApplicationData.thisYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (appName in applicationData) {
      applicationData[appName].thisYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    //Set-up base values for previous year data
    allApplicationData.previousYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (appName in applicationData) {
      applicationData[appName].previousYearUserData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }


    gaRequester.queryGA({
      "start-date": formatDateString(lastYearStartDate, "query"),
      "end-date": formatDateString(lastYearEndDate, "query"),
      "ids": ids,
      "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth",
      "metrics": "ga:users",
      "filters": topPagesFilter,
      "sort": "ga:pageTitle,ga:yearMonth"
    }).then(function (results) {

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
          allApplicationData.thisYearUserData[+dataRow[2]] += (+dataRow[3]);
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
          allApplicationData.previousYearUserData[+dataRow[2]] += (+dataRow[3]);
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
  assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveWeeklySeesions assert failed - topPagesFilter: ' + topPagesFilter);

  return new Promise(function (resolve, reject) {
    var appName;

    //Set-up base values for current week session data
    allApplicationData.currentWeekSessionData = [0, 0, 0, 0, 0, 0, 0];

    for (appName in applicationData) {
      applicationData[appName].currentWeekSessionData = [0, 0, 0, 0, 0, 0, 0];
    }

    //Set-up base values for last week session data
    allApplicationData.lastWeekSessionData = [0, 0, 0, 0, 0, 0, 0];

    for (appName in applicationData) {
      applicationData[appName].lastWeekSessionData = [0, 0, 0, 0, 0, 0, 0];
    }

    gaRequester.queryGA({
      "start-date": formatDateString(startDate, "query"),
      "end-date": formatDateString(endDate, "query"),
      "ids": ids,
      "dimensions": "ga:pageTitle,ga:date,ga:nthDay",
      "metrics": "ga:avgSessionDuration",
      "filters": topPagesFilter,
      "sort": "ga:pageTitle,ga:date"
    }).then(function (results) {

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
          allApplicationData.currentWeekSessionData[+dataRow[2]] += roundTo2((+dataRow[3] / 60));
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
          allApplicationData.lastWeekSessionData[+dataRow[2]] += roundTo2((+dataRow[3] / 60));
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
          for (var dataCounter = 0; dataCounter < applicationData[appName].lastYearSessionData.length; dataCounter++) {
            var arrLength = applicationData[appName].lastYearSessionData[dataCounter].length;
            var dataRow = applicationData[appName].lastYearSessionData[dataCounter];

            //Re-sort array into numeric order
            sortNumericalArrayAsc(dataRow);


            //Choose middle array value (median)
            applicationData[appName].lastYearMedianSessionData[dataCounter] = dataRow[Math.round(arrLength / 2)] || 0;
            //Add median value for this application to the overall median value
            allApplicationData.lastYearMedianSessionData[dataCounter] += (dataRow[Math.round(arrLength / 2)] || 0);
          }
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
  assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveYearlyBrowsers assert failed - topPagesFilter: ' + topPagesFilter);
  assert((typeof topBrowsersFilter !== "undefined" && topBrowsersFilter !== ""), 'retrieveYearlyBrowsers assert failed - topBrowsersFilter: ' + topBrowsersFilter);


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
        for (var browserCounter = 0; browserCounter < topBrowsersArray.length; browserCounter++) {
          applicationData[appName].browserData[topBrowsersArray[browserCounter]] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }

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
          applicationData[dataRow[0]].browserTotals[+dataRow[3]] += (+dataRow[4]);

          //Add value to all application total
          allApplicationData.browserData[dataRow[1]][+dataRow[3]] += (+dataRow[4]);
          //Add to browser monthly overall total value
          allApplicationData.browserTotals[+dataRow[3]] += (+dataRow[4]);
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
          for (var bCounter = 0; bCounter < topBrowsersArray.length; bCounter++) {
            var browserName = topBrowsersArray[bCounter];

            for (var monthCounter = 0; monthCounter < 12; monthCounter++) {
              applicationData[appTName].browserData[browserName][monthCounter] = roundTo2(applicationData[appTName].browserData[browserName][monthCounter] /
                applicationData[appTName].browserTotals[monthCounter] * 100);
            }


          }


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
  assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveVisitorReturns assert failed - topPagesFilter: ' + topPagesFilter);


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
            applicationData[dataRow[0]].visitorTotal += (+dataRow[2]);

            //Add value to all application total
            allApplicationData.visitorReturns["New visitors"] += (+dataRow[2]);
            //Add to overall total value
            allApplicationData.visitorTotal += (+dataRow[2]);
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
            applicationData[dataRow[0]].visitorReturns["Returned within a day"] += (+dataRow[2]);
            //Add value to all application total
            allApplicationData.visitorReturns["Returned within a day"] += (+dataRow[2]);
          } else if ((+dataRow[1]) > 1 && (+dataRow[1]) <= 7) {
            //Add to value for each application    
            applicationData[dataRow[0]].visitorReturns["Returned within a week"] += (+dataRow[2]);
            //Add value to all application total
            allApplicationData.visitorReturns["Returned within a week"] += (+dataRow[2]);
          } else if ((+dataRow[1]) > 7 && (+dataRow[1]) <= 31) {
            //Add to value for each application    
            applicationData[dataRow[0]].visitorReturns["Returned within a month"] += (+dataRow[2]);
            //Add value to all application total
            allApplicationData.visitorReturns["Returned within a month"] += (+dataRow[2]);
          } else if ((+dataRow[1]) > 31 && (+dataRow[1]) <= 365) {
            //Add to value for each application    
            applicationData[dataRow[0]].visitorReturns["Returned within a year"] += (+dataRow[2]);
            //Add value to all application total
            allApplicationData.visitorReturns["Returned within a year"] += (+dataRow[2]);
          }


          //Add to total value for each application
          applicationData[dataRow[0]].visitorTotal += (+dataRow[2]);
          //Add to overall total value
          allApplicationData.visitorTotal += (+dataRow[2]);

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
          Math.round(dataRow[1] / allApplicationData.visitorTotal * 100) + "%)");
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

        for (var aCounter = 0; aCounter < applicationData[appTName].visitorReturns.data.length; aCounter++) {
          var dataRow = applicationData[appTName].visitorReturns.data[aCounter];

          applicationData[appTName].visitorReturns.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
            Math.round(dataRow[1] / applicationData[appTName].visitorTotal * 100) + "%)");
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
 * Retrieve the total visits for the last week and the last year - used for comparison in other data functions
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveTotalVisits() {
  "use strict";

  assert(isDate(startDate), 'retrieveSearchTypes assert failed - startDate: ' + startDate);
  assert(isDate(endDate), 'retrieveSearchTypes assert failed - endDate: ' + endDate);
  assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveSearchTypes assert failed - topPagesFilter: ' + topPagesFilter);
  assert(isDate(lastYearStartDate), 'retrieveVisitorReturns assert failed - lastYearStartDate: ' + lastYearStartDate);
  assert(isDate(lastYearEndDate), 'retrieveVisitorReturns assert failed - lastYearEndDate: ' + lastYearEndDate);


  return new Promise(function (resolve, reject) {
    //The first query for the overall number of visits for the week
    gaRequester.queryGA({
      "start-date": formatDateString(startDate, "query"),
      "end-date": formatDateString(endDate, "query"),
      "ids": ids,
      "dimensions": "ga:pageTitle",
      "metrics": "ga:pageviews",
      "filters": topPagesFilter,
      "sort": "ga:pageTitle"
    }).then(function (results) {
      allApplicationData.totalVisitsForWeek = 0;

      for (var appName in applicationData) {
        applicationData[appName].totalVisitsForWeek = 0;
      }

      if (results) {
        results.rows.forEach(function (dataRow) {
          /*Results structure -   dataRow[0] = appName
                                  dataRow[1] = Visits
          */
          //Add to value for each application    
          applicationData[dataRow[0]].totalVisitsForWeek = (+dataRow[1]);
          allApplicationData.totalVisitsForWeek = allApplicationData.totalVisitsForWeek + (+dataRow[1]);
        });
      }

      return gaRequester.queryGA({
        "start-date": formatDateString(lastYearStartDate, "query"),
        "end-date": formatDateString(lastYearEndDate, "query"),
        "ids": ids,
        "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth",
        "metrics": "ga:pageviews",
        "filters": topPagesFilter,
        "sort": "ga:pageTitle,ga:yearMonth"
      });
    }).then(function (results) {

      //map in 0 values for each browser month combination
      allApplicationData.totalVisitsForYear = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      for (var appName in applicationData) {
        applicationData[appName].totalVisitsForYear = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }

      if (results) {
        results.rows.forEach(function (dataRow) {
          /*Results structure -   dataRow[0] = appName
                                  dataRow[1] = year and month
                                  dataRow[2] = month index
                                  dataRow[3] = Visits
          */
          //Add to value for each application    
          applicationData[dataRow[0]].totalVisitsForYear[+dataRow[2]] = (+dataRow[3]);
          allApplicationData.totalVisitsForYear[+dataRow[2]] += (+dataRow[3]);
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
 * Retrieve the breakdown of search types for the past week and monthly breakdowns over the past year
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveSearchTypes() {
  "use strict";

  assert(isDate(startDate), 'retrieveSearchTypes assert failed - startDate: ' + startDate);
  assert(isDate(endDate), 'retrieveSearchTypes assert failed - endDate: ' + endDate);
  assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveSearchTypes assert failed - topPagesFilter: ' + topPagesFilter);
  assert(isDate(lastYearStartDate), 'retrieveSearchTypes assert failed - lastYearStartDate: ' + lastYearStartDate);
  assert(isDate(lastYearEndDate), 'retrieveSearchTypes assert failed - lastYearEndDate: ' + lastYearEndDate);
  assert(typeof allApplicationData.totalVisitsForWeek !== "undefined", 'retrieveSearchTypes assert failed - allApplicationData.totalVisitsForWeek does not exist');
  assert(typeof allApplicationData.totalVisitsForYear !== "undefined", 'retrieveSearchTypes assert failed - allApplicationData.totalVisitsForYear does not exist');


  return new Promise(function (resolve, reject) {
    //Retrieve the search type data for the week
    gaRequester.queryGA({
      "start-date": formatDateString(startDate, "query"),
      "end-date": formatDateString(endDate, "query"),
      "ids": ids,
      "dimensions": "ga:pageTitle,ga:eventAction,ga:eventLabel",
      "metrics": "ga:totalEvents",
      "filters": topPagesFilter + ";ga:eventAction==search",
      "sort": "ga:pageTitle,-ga:totalEvents"
    }).then(function (results) {
      //Set up data structures to hold search types
      allApplicationData.weekSearchTypes = {};
      allApplicationData.weekSearchTypes.rawValues = {};
      allApplicationData.weekSearchTypes.totalSearches = 0;
      allApplicationData.weekSearchTypes.data = [];
      allApplicationData.weekSearchTypes.labels = [];
      allApplicationData.weekSearchTypes.dataPerVisit = [];
      allApplicationData.weekSearchTypes.labelsPerVisit = [];

      for (var appName in applicationData) {
        applicationData[appName].weekSearchTypes = {};
        applicationData[appName].weekSearchTypes.rawValues = {};
        applicationData[appName].weekSearchTypes.totalSearches = 0;
        applicationData[appName].weekSearchTypes.data = [];
        applicationData[appName].weekSearchTypes.labels = [];
        applicationData[appName].weekSearchTypes.dataPerVisit = [];
        applicationData[appName].weekSearchTypes.labelsPerVisit = [];
      }

      if (results) {
        results.rows.forEach(function (dataRow) {
          /*Results structure -   dataRow[0] = appName
                                  dataRow[1] = eventAction (search)
                                  dataRow[2] = eventLabel (search Type)
                                  dataRow[3] = No of times
          */
          //Add to value for each application    
          applicationData[dataRow[0]].weekSearchTypes.rawValues[dataRow[2]] = (+dataRow[3]);

          //Add to total value
          if (!allApplicationData.weekSearchTypes.rawValues[dataRow[2]]) {
            allApplicationData.weekSearchTypes.rawValues[dataRow[2]] = 0;
          }

          allApplicationData.weekSearchTypes.rawValues[dataRow[2]] += (+dataRow[3]);

          //Add to search totals
          applicationData[dataRow[0]].weekSearchTypes.totalSearches += (+dataRow[3]);
          allApplicationData.weekSearchTypes.totalSearches += (+dataRow[3]);

        });


        //Assign the values to data arrays used for chart
        for (var appTName in applicationData) {
          for (var searchType in applicationData[appTName].weekSearchTypes.rawValues) {
            //Normal raw values
            var dataIndex = applicationData[appTName].weekSearchTypes.data.length;
            applicationData[appTName].weekSearchTypes.data.push([]);
            applicationData[appTName].weekSearchTypes.data[dataIndex].push(searchType);
            applicationData[appTName].weekSearchTypes.data[dataIndex].push(applicationData[appTName].weekSearchTypes.rawValues[searchType]);
            //Make calulcations for data per visit
            applicationData[appTName].weekSearchTypes.dataPerVisit.push([]);
            applicationData[appTName].weekSearchTypes.dataPerVisit[dataIndex].push(searchType);
            applicationData[appTName].weekSearchTypes.dataPerVisit[dataIndex].push(roundTo2(applicationData[appTName].weekSearchTypes.rawValues[searchType] /
              applicationData[appTName].totalVisitsForWeek));
          }

          //Sort into descending order
          sortNumericalArrayDesc(applicationData[appTName].weekSearchTypes.data, 1);
          sortNumericalArrayDesc(applicationData[appTName].weekSearchTypes.dataPerVisit, 1);

          //Now create the label values for normal vals
          for (var aCounter = 0; aCounter < applicationData[appTName].weekSearchTypes.data.length; aCounter++) {
            var dataRow = applicationData[appTName].weekSearchTypes.data[aCounter];

            applicationData[appTName].weekSearchTypes.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
              Math.round(dataRow[1] / (applicationData[appTName].weekSearchTypes.totalSearches || 1) * 100) + "%)");

          }

          //Now create the label values for vals per visit
          for (var aCounterP = 0; aCounterP < applicationData[appTName].weekSearchTypes.dataPerVisit.length; aCounterP++) {
            var dataRowP = applicationData[appTName].weekSearchTypes.dataPerVisit[aCounterP];

            applicationData[appTName].weekSearchTypes.labelsPerVisit.push(dataRowP[0] + ": " + dataRowP[1] + " times per visit");
          }

        }


        //Assign the values to data arrays used for chart
        for (var searchTypeAll in allApplicationData.weekSearchTypes.rawValues) {
          var dataIndexAll = allApplicationData.weekSearchTypes.data.length;
          //Normal raw values
          allApplicationData.weekSearchTypes.data.push([]);
          allApplicationData.weekSearchTypes.data[dataIndexAll].push(searchTypeAll);
          allApplicationData.weekSearchTypes.data[dataIndexAll].push(allApplicationData.weekSearchTypes.rawValues[searchTypeAll]);
          //Make calulcations for data per visit
          allApplicationData.weekSearchTypes.dataPerVisit.push([]);
          allApplicationData.weekSearchTypes.dataPerVisit[dataIndexAll].push(searchTypeAll);
          allApplicationData.weekSearchTypes.dataPerVisit[dataIndexAll].push(roundTo2(allApplicationData.weekSearchTypes.rawValues[searchTypeAll] /
            (allApplicationData.totalVisitsForWeek || 1)));
        }

        //Sort into descending order
        sortNumericalArrayDesc(allApplicationData.weekSearchTypes.data, 1);
        sortNumericalArrayDesc(allApplicationData.weekSearchTypes.dataPerVisit, 1);

        //Now create the label values for normal vals
        allApplicationData.weekSearchTypes.data.forEach(function (dataRow) {
          allApplicationData.weekSearchTypes.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
            Math.round(dataRow[1] / (allApplicationData.weekSearchTypes.totalSearches || 1) * 100) + "%)");
        });

        //Now create the label values for vals per visit
        allApplicationData.weekSearchTypes.dataPerVisit.forEach(function (dataRow) {
          allApplicationData.weekSearchTypes.labelsPerVisit.push(dataRow[0] + ": " + dataRow[1] + " times per visit");
        });

      }

      //Now return the previous year's data
      return gaRequester.queryGA({
        "start-date": formatDateString(lastYearStartDate, "query"),
        "end-date": formatDateString(lastYearEndDate, "query"),
        "ids": ids,
        "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth,ga:eventAction,ga:eventLabel",
        "metrics": "ga:totalEvents",
        "filters": topPagesFilter + ";ga:eventAction==search",
        "sort": "ga:pageTitle,ga:yearMonth,ga:nthMonth"
      });
    }).then(function (results) {
      //Set up data structures to hold search types
      allApplicationData.yearSearchTypes = {};
      allApplicationData.yearSearchTypes.rawValues = {};
      allApplicationData.yearSearchTypes.monthTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      allApplicationData.yearSearchTypes.data = [];

      for (var appName in applicationData) {
        applicationData[appName].yearSearchTypes = {};
        applicationData[appName].yearSearchTypes.rawValues = {};
        applicationData[appName].yearSearchTypes.monthTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        applicationData[appName].yearSearchTypes.data = [];
      }

      if (results) {
        results.rows.forEach(function (dataRow) {
          /*Results structure -   dataRow[0] = appName
                                  dataRow[1] = year and month
                                  dataRow[2] = month Index
                                  dataRow[3] = eventAction (search)
                                  dataRow[4] = eventLabel (search Type)
                                  dataRow[5] = No of times
          */
          //Add if values exist for this search type    
          if (!applicationData[dataRow[0]].yearSearchTypes.rawValues[dataRow[4]]) {
            //if the search type is new, map in 0s for each month
            applicationData[dataRow[0]].yearSearchTypes.rawValues[dataRow[4]] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }

          //Map in value to search type / month index combination
          applicationData[dataRow[0]].yearSearchTypes.rawValues[dataRow[4]][+dataRow[2]] = (+dataRow[5]);
          applicationData[dataRow[0]].yearSearchTypes.monthTotals[+dataRow[2]] += (+dataRow[5]);

          //Add to total value
          if (!allApplicationData.yearSearchTypes.rawValues[dataRow[4]]) {
            allApplicationData.yearSearchTypes.rawValues[dataRow[4]] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }


          allApplicationData.yearSearchTypes.rawValues[dataRow[4]][+dataRow[2]] += (+dataRow[5]);
          allApplicationData.yearSearchTypes.monthTotals[+dataRow[2]] += (+dataRow[5]);
        });
        //Assign the values to data arrays used for chart
        for (var appYName in applicationData) {

          //Assign the values to data arrays used for chart
          for (var searchType in applicationData[appYName].yearSearchTypes.rawValues) {
            var dataIndex = applicationData[appYName].yearSearchTypes.data.length;

            //Need to convert raw values to percentgaes
            applicationData[appYName].yearSearchTypes.data.push([]);
            applicationData[appYName].yearSearchTypes.data[dataIndex].push(searchType);

            //Loop through each month values and map into data array
            for (var monthCounter = 0; monthCounter < 12; monthCounter++) {
              //Convert to percentage of total
              applicationData[appYName].yearSearchTypes.data[dataIndex].push(roundTo2(applicationData[appYName].yearSearchTypes.rawValues[searchType][monthCounter] /
                (applicationData[appYName].yearSearchTypes.monthTotals[monthCounter] || 1) * 100));

            }

          }
        }

        //Assign the values to data arrays used for chart
        for (var searchTypeAll in allApplicationData.yearSearchTypes.rawValues) {
          var dataIndexAll = allApplicationData.yearSearchTypes.data.length;

          //Need to convert raw values to percentgaes
          allApplicationData.yearSearchTypes.data.push([]);
          allApplicationData.yearSearchTypes.data[dataIndexAll].push(searchTypeAll);

          //Loop through each month values and map into data array
          for (var monthCounterAll = 0; monthCounterAll < 12; monthCounterAll++) {
            //Convert to percentage of total
            allApplicationData.yearSearchTypes.data[dataIndexAll].push(roundTo2(allApplicationData.yearSearchTypes.rawValues[searchTypeAll][monthCounterAll] /
              (allApplicationData.yearSearchTypes.monthTotals[monthCounterAll] || 1) * 100));

          }

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
 * Retrieve the breakdown of map types displayed for the past week and monthly breakdowns over the past year
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveMapTypes() {
  "use strict";

  assert(isDate(startDate), 'retrieveMapTypes assert failed - startDate: ' + startDate);
  assert(isDate(endDate), 'retrieveMapTypes assert failed - endDate: ' + endDate);
  assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveMapTypes assert failed - topPagesFilter: ' + topPagesFilter);
  assert(isDate(lastYearStartDate), 'retrieveMapTypes assert failed - lastYearStartDate: ' + lastYearStartDate);
  assert(isDate(lastYearEndDate), 'retrieveMapTypes assert failed - lastYearEndDate: ' + lastYearEndDate);
  assert(typeof allApplicationData.totalVisitsForWeek !== "undefined", 'retrieveMapTypes assert failed - allApplicationData.totalVisitsForWeek does not exist');
  assert(typeof allApplicationData.totalVisitsForYear !== "undefined", 'retrieveMapTypes assert failed - allApplicationData.totalVisitsForYear does not exist');


  return new Promise(function (resolve, reject) {
    //Retrieve the search type data for the week
    gaRequester.queryGA({
      "start-date": formatDateString(startDate, "query"),
      "end-date": formatDateString(endDate, "query"),
      "ids": ids,
      "dimensions": "ga:pageTitle,ga:eventAction,ga:eventLabel",
      "metrics": "ga:totalEvents",
      "filters": topPagesFilter + ";ga:eventAction==default,ga:eventLabel==Victoria,ga:eventLabel==Map,ga:eventLabel==Imagery",
      "sort": "ga:pageTitle,-ga:totalEvents"
    }).then(function (results) {
      //Set up data structures to hold search types
      allApplicationData.weekMapTypes = {};
      allApplicationData.weekMapTypes.rawValues = {};
      allApplicationData.weekMapTypes.totalMaps = 0;
      allApplicationData.weekMapTypes.data = [];
      allApplicationData.weekMapTypes.labels = [];

      for (var appName in applicationData) {
        applicationData[appName].weekMapTypes = {};
        applicationData[appName].weekMapTypes.rawValues = {};
        applicationData[appName].weekMapTypes.totalMaps = 0;
        applicationData[appName].weekMapTypes.data = [];
        applicationData[appName].weekMapTypes.labels = [];
      }

      if (results) {
        results.rows.forEach(function (dataRow) {
          /*Results structure -   dataRow[0] = appName
                                  dataRow[1] = eventAction 'default' for default map and 'click' for user selected map
                                  dataRow[2] = Map type - when user has initiated a 'click'
                                  dataRow[3] = No of times
          */
          //Add to value for each application 
          var dataName;

          if (dataRow[1] === "default") {
            dataName = "Default map";
          } else {
            dataName = dataRow[2];
          }

          applicationData[dataRow[0]].weekMapTypes.rawValues[dataName] = (+dataRow[3]);


          //Add to total value
          if (!allApplicationData.weekMapTypes.rawValues[dataName]) {
            allApplicationData.weekMapTypes.rawValues[dataName] = 0;
          }

          allApplicationData.weekMapTypes.rawValues[dataName] += (+dataRow[3]);

          //Add to search totals
          applicationData[dataRow[0]].weekMapTypes.totalMaps += (+dataRow[3]);
          allApplicationData.weekMapTypes.totalMaps += (+dataRow[3]);

        });


        //Assign the values to data arrays used for chart
        for (var appTName in applicationData) {
          for (var mapType in applicationData[appTName].weekMapTypes.rawValues) {
            //Normal raw values
            var dataIndex = applicationData[appTName].weekMapTypes.data.length;
            applicationData[appTName].weekMapTypes.data.push([]);
            applicationData[appTName].weekMapTypes.data[dataIndex].push(mapType);
            applicationData[appTName].weekMapTypes.data[dataIndex].push(applicationData[appTName].weekMapTypes.rawValues[mapType]);
            //Make calulcations for data per visit
          }

          //Sort into descending order
          sortNumericalArrayDesc(applicationData[appTName].weekMapTypes.data, 1);

          //Now create the label values for normal vals
          for (var aCounter = 0; aCounter < applicationData[appTName].weekMapTypes.data.length; aCounter++) {
            var dataRow = applicationData[appTName].weekMapTypes.data[aCounter];

            applicationData[appTName].weekMapTypes.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
              Math.round(dataRow[1] / (applicationData[appTName].weekMapTypes.totalMaps || 1) * 100) + "%)");
          }


        }


        //Assign the values to data arrays used for chart
        for (var mapTypeAll in allApplicationData.weekMapTypes.rawValues) {
          var dataIndexAll = allApplicationData.weekMapTypes.data.length;
          //Normal raw values
          allApplicationData.weekMapTypes.data.push([]);
          allApplicationData.weekMapTypes.data[dataIndexAll].push(mapTypeAll);
          allApplicationData.weekMapTypes.data[dataIndexAll].push(allApplicationData.weekMapTypes.rawValues[mapTypeAll]);
          //Make calulcations for data per visit
        }

        //Sort into descending order
        sortNumericalArrayDesc(allApplicationData.weekMapTypes.data, 1);

        //Now create the label values for normal vals
        allApplicationData.weekMapTypes.data.forEach(function (dataRow) {
          allApplicationData.weekMapTypes.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
            Math.round(dataRow[1] / (allApplicationData.weekMapTypes.totalMaps || 1) * 100) + "%)");
        });


      }

      //Now return the previous year's data
      return gaRequester.queryGA({
        "start-date": formatDateString(lastYearStartDate, "query"),
        "end-date": formatDateString(lastYearEndDate, "query"),
        "ids": ids,
        "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth,ga:eventAction,ga:eventLabel",
        "metrics": "ga:totalEvents",
        "filters": topPagesFilter + ";ga:eventAction==default,ga:eventLabel==Victoria,ga:eventLabel==Map,ga:eventLabel==Imagery",
        "sort": "ga:pageTitle,ga:yearMonth,ga:nthMonth,-ga:totalEvents"
      });
    }).then(function (results) {
      //Set up data structures to hold search types
      allApplicationData.yearMapTypes = {};
      allApplicationData.yearMapTypes.rawValues = {};
      allApplicationData.yearMapTypes.monthTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      allApplicationData.yearMapTypes.data = [];

      for (var appName in applicationData) {
        applicationData[appName].yearMapTypes = {};
        applicationData[appName].yearMapTypes.rawValues = {};
        applicationData[appName].yearMapTypes.monthTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        applicationData[appName].yearMapTypes.data = [];
      }

      if (results) {
        results.rows.forEach(function (dataRow) {
          /*Results structure -   dataRow[0] = appName
                                  dataRow[1] = year and month
                                  dataRow[2] = month Index
                                  dataRow[3] = eventAction 'default' for default map and 'click' for user selected map
                                  dataRow[4] = Map type - when user has initiated a 'click'
                                  dataRow[5] = No of times
          */
          var yearDataName;

          if (dataRow[3] === "default") {
            yearDataName = "Default map";
          } else {
            yearDataName = dataRow[4];
          }

          //Add if values exist for this search type    
          if (!applicationData[dataRow[0]].yearMapTypes.rawValues[yearDataName]) {
            //if the search type is new, map in 0s for each month
            applicationData[dataRow[0]].yearMapTypes.rawValues[yearDataName] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }

          //Map in value to search type / month index combination
          applicationData[dataRow[0]].yearMapTypes.rawValues[yearDataName][+dataRow[2]] = (+dataRow[5]);
          applicationData[dataRow[0]].yearMapTypes.monthTotals[+dataRow[2]] += (+dataRow[5]);

          //Add to total value
          if (!allApplicationData.yearMapTypes.rawValues[yearDataName]) {
            allApplicationData.yearMapTypes.rawValues[yearDataName] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }


          allApplicationData.yearMapTypes.rawValues[yearDataName][+dataRow[2]] += (+dataRow[5]);
          allApplicationData.yearMapTypes.monthTotals[+dataRow[2]] += (+dataRow[5]);
        });
        //Assign the values to data arrays used for chart
        for (var appYName in applicationData) {

          //Assign the values to data arrays used for chart
          for (var mapType in applicationData[appYName].yearMapTypes.rawValues) {
            var dataIndex = applicationData[appYName].yearMapTypes.data.length;

            //Need to convert raw values to percentgaes
            applicationData[appYName].yearMapTypes.data.push([]);
            applicationData[appYName].yearMapTypes.data[dataIndex].push(mapType);

            //Loop through each month values and map into data array
            for (var monthCounter = 0; monthCounter < 12; monthCounter++) {
              //Convert to percentage of total
              applicationData[appYName].yearMapTypes.data[dataIndex].push(roundTo2(applicationData[appYName].yearMapTypes.rawValues[mapType][monthCounter] /
                (applicationData[appYName].yearMapTypes.monthTotals[monthCounter] || 1) * 100));

            }

          }
        }

        //Assign the values to data arrays used for chart
        for (var mapTypeAll in allApplicationData.yearMapTypes.rawValues) {
          var dataIndexAll = allApplicationData.yearMapTypes.data.length;

          //Need to convert raw values to percentgaes
          allApplicationData.yearMapTypes.data.push([]);
          allApplicationData.yearMapTypes.data[dataIndexAll].push(mapTypeAll);

          //Loop through each month values and map into data array
          for (var monthCounterAll = 0; monthCounterAll < 12; monthCounterAll++) {
            //Convert to percentage of total
            allApplicationData.yearMapTypes.data[dataIndexAll].push(roundTo2(allApplicationData.yearMapTypes.rawValues[mapTypeAll][monthCounterAll] /
              (allApplicationData.yearMapTypes.monthTotals[monthCounterAll] || 1) * 100));

          }

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
 * Retrieve the breakdown of activites types for the past week and monthly breakdowns over the past year
 * @return {Promise} a promise which wil resolve with the data
 */
function retrieveActivities() {
  "use strict";

  assert(isDate(startDate), 'retrieveActivities assert failed - startDate: ' + startDate);
  assert(isDate(endDate), 'retrieveActivities assert failed - endDate: ' + endDate);
  assert((typeof topPagesFilter !== "undefined" && topPagesFilter !== ""), 'retrieveActivities assert failed - topPagesFilter: ' + topPagesFilter);
  assert(isDate(lastYearStartDate), 'retrieveActivities assert failed - lastYearStartDate: ' + lastYearStartDate);
  assert(isDate(lastYearEndDate), 'retrieveActivities assert failed - lastYearEndDate: ' + lastYearEndDate);
  assert(typeof allApplicationData.totalVisitsForWeek !== "undefined", 'retrieveActivities assert failed - allApplicationData.totalVisitsForWeek does not exist');
  assert(typeof allApplicationData.totalVisitsForYear !== "undefined", 'retrieveActivities assert failed - allApplicationData.totalVisitsForYear does not exist');
  assert(typeof allApplicationData.weekSearchTypes.totalSearches !== "undefined", 'retrieveActivities assert failed - allApplicationData.weekSearchTypes.totalSearches does not exist');
  assert(typeof allApplicationData.yearSearchTypes.monthTotals !== "undefined", 'retrieveActivities assert failed - allApplicationData.monthTotals does not exist');


  return new Promise(function (resolve, reject) {
    //Create base values and Map in the values previously retrieved for search
    allApplicationData.weekActivities = {};
    allApplicationData.weekActivities.rawValues = {};
    allApplicationData.weekActivities.rawValues.Search = allApplicationData.weekSearchTypes.totalSearches;
    allApplicationData.weekActivities.totalActivities = allApplicationData.weekSearchTypes.totalSearches;
    allApplicationData.weekActivities.data = [];
    allApplicationData.weekActivities.labels = [];
    allApplicationData.weekActivities.dataPerVisit = [];
    allApplicationData.weekActivities.labelsPerVisit = [];

    allApplicationData.weekActivityTypes = {};
    allApplicationData.weekActivityTypes.rawValues = {};
    allApplicationData.weekActivityTypes.rawValues.Search = allApplicationData.weekSearchTypes.totalSearches;
    allApplicationData.weekActivityTypes.data = [];
    allApplicationData.weekActivityTypes.labels = [];
    allApplicationData.weekActivityTypes.dataPerVisit = [];
    allApplicationData.weekActivityTypes.labelsPerVisit = [];

    allApplicationData.yearActivities = {};
    allApplicationData.yearActivities.rawValues = {};
    allApplicationData.yearActivities.rawValues.Search = allApplicationData.yearSearchTypes.monthTotals.slice();
    allApplicationData.yearActivities.monthTotals = allApplicationData.yearSearchTypes.monthTotals.slice();
    allApplicationData.yearActivities.data = [];

    allApplicationData.yearActivityTypes = {};
    allApplicationData.yearActivityTypes.rawValues = {};
    allApplicationData.yearActivityTypes.rawValues.Search = allApplicationData.yearSearchTypes.monthTotals.slice();
    allApplicationData.yearActivityTypes.data = [];


    for (var appName in applicationData) {
      applicationData[appName].weekActivities = {};
      applicationData[appName].weekActivities.rawValues = {};
      applicationData[appName].weekActivities.rawValues.Search = applicationData[appName].weekSearchTypes.totalSearches;
      applicationData[appName].weekActivities.totalActivities = applicationData[appName].weekSearchTypes.totalSearches;
      applicationData[appName].weekActivities.data = [];
      applicationData[appName].weekActivities.labels = [];
      applicationData[appName].weekActivities.dataPerVisit = [];
      applicationData[appName].weekActivities.labelsPerVisit = [];

      applicationData[appName].weekActivityTypes = {};
      applicationData[appName].weekActivityTypes.rawValues = {};
      applicationData[appName].weekActivityTypes.rawValues.Search = applicationData[appName].weekSearchTypes.totalSearches;
      applicationData[appName].weekActivityTypes.data = [];
      applicationData[appName].weekActivityTypes.labels = [];
      applicationData[appName].weekActivityTypes.dataPerVisit = [];
      applicationData[appName].weekActivityTypes.labelsPerVisit = [];

      applicationData[appName].yearActivities = {};
      applicationData[appName].yearActivities.rawValues = {};
      applicationData[appName].yearActivities.rawValues.Search = applicationData[appName].yearSearchTypes.monthTotals.slice();
      applicationData[appName].yearActivities.monthTotals = applicationData[appName].yearSearchTypes.monthTotals.slice();
      applicationData[appName].yearActivities.data = [];

      applicationData[appName].yearActivityTypes = {};
      applicationData[appName].yearActivityTypes.rawValues = {};
      applicationData[appName].yearActivityTypes.rawValues.Search = applicationData[appName].yearSearchTypes.monthTotals.slice();
      applicationData[appName].yearActivityTypes.data = [];
    }



    //Retrieve the activity type data for the week
    gaRequester.queryGA({
      "start-date": formatDateString(startDate, "query"),
      "end-date": formatDateString(endDate, "query"),
      "ids": ids,
      "dimensions": "ga:pageTitle,ga:eventLabel",
      "metrics": "ga:totalEvents",
      "filters": topPagesFilter + ";ga:eventLabel!=Victoria;ga:eventLabel!=Map;ga:eventLabel!=Imagery;ga:eventAction==click",
      "sort": "ga:pageTitle,-ga:totalEvents",
      "max-results": 10000
    }).then(function (results) {

      if (results) {
        results.rows.forEach(function (dataRow) {
          /*Results structure -   dataRow[0] = appName
                                  dataRow[1] = eventLabel (activity type)
                                  dataRow[2] = No of times
          */
          //Add to value for each application    
          var activityType = retrieveActivityType(dataRow[1]);

          applicationData[dataRow[0]].weekActivities.rawValues[dataRow[1]] = (+dataRow[2]);

          //May already have search values in the activity types data, so we must check if it exists and set it to 0 if it doesn't
          if (!applicationData[dataRow[0]].weekActivityTypes.rawValues[activityType]) {
            applicationData[dataRow[0]].weekActivityTypes.rawValues[activityType] = 0;
          }
          //May already have search values in the activity types data, so we must add this value to the existing value
          applicationData[dataRow[0]].weekActivityTypes.rawValues[activityType] += (+dataRow[2]);

          //Add to total value
          if (!allApplicationData.weekActivities.rawValues[dataRow[1]]) {
            allApplicationData.weekActivities.rawValues[dataRow[1]] = 0;
          }

          allApplicationData.weekActivities.rawValues[dataRow[1]] += (+dataRow[2]);

          //Add to total value for types
          if (!allApplicationData.weekActivityTypes.rawValues[activityType]) {
            allApplicationData.weekActivityTypes.rawValues[activityType] = 0;
          }

          allApplicationData.weekActivityTypes.rawValues[activityType] += (+dataRow[2]);


          //Add to activity totals
          applicationData[dataRow[0]].weekActivities.totalActivities += (+dataRow[2]);
          allApplicationData.weekActivities.totalActivities += (+dataRow[2]);


        });


        //Assign the values to data arrays used for chart
        for (var appTName in applicationData) {
          //Activity data
          for (var activity in applicationData[appTName].weekActivities.rawValues) {
            //Normal raw values
            var dataIndex = applicationData[appTName].weekActivities.data.length;
            applicationData[appTName].weekActivities.data.push([]);
            applicationData[appTName].weekActivities.data[dataIndex].push(activity);
            applicationData[appTName].weekActivities.data[dataIndex].push(applicationData[appTName].weekActivities.rawValues[activity]);
            //Make calulcations for data per visit
            applicationData[appTName].weekActivities.dataPerVisit.push([]);
            applicationData[appTName].weekActivities.dataPerVisit[dataIndex].push(activity);
            applicationData[appTName].weekActivities.dataPerVisit[dataIndex].push(roundTo2(applicationData[appTName].weekActivities.rawValues[activity] /
              applicationData[appTName].totalVisitsForWeek));
          }

          //Sort into descending order
          sortNumericalArrayDesc(applicationData[appTName].weekActivities.data, 1);
          sortNumericalArrayDesc(applicationData[appTName].weekActivities.dataPerVisit, 1);

          //Now create the label values for normal vals
          for (var aCounter = 0; aCounter < applicationData[appTName].weekActivities.data.length; aCounter++) {
            var dataRow = applicationData[appTName].weekActivities.data[aCounter];

            applicationData[appTName].weekActivities.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
              Math.round(dataRow[1] / (applicationData[appTName].weekActivities.totalActivities || 1) * 100) + "%)");
          }

          //Now create the label values for vals per visit
          for (var aCounterP = 0; aCounterP < applicationData[appTName].weekActivities.dataPerVisit.length; aCounterP++) {
            var dataRowP = applicationData[appTName].weekActivities.dataPerVisit[aCounterP];

            applicationData[appTName].weekActivities.labelsPerVisit.push(dataRowP[0] + ": " + dataRowP[1] + " times per visit");
          }

          //Run same process for activity type data
          for (var activityType in applicationData[appTName].weekActivityTypes.rawValues) {
            //Normal raw values
            var dataIndexType = applicationData[appTName].weekActivityTypes.data.length;
            applicationData[appTName].weekActivityTypes.data.push([]);
            applicationData[appTName].weekActivityTypes.data[dataIndexType].push(activityType);
            applicationData[appTName].weekActivityTypes.data[dataIndexType].push(applicationData[appTName].weekActivityTypes.rawValues[activityType]);
            //Make calulcations for data per visit
            applicationData[appTName].weekActivityTypes.dataPerVisit.push([]);
            applicationData[appTName].weekActivityTypes.dataPerVisit[dataIndexType].push(activityType);
            applicationData[appTName].weekActivityTypes.dataPerVisit[dataIndexType].push(roundTo2(applicationData[appTName].weekActivityTypes.rawValues[activityType] /
              applicationData[appTName].totalVisitsForWeek));
          }

          //Sort into descending order
          sortNumericalArrayDesc(applicationData[appTName].weekActivityTypes.data, 1);
          sortNumericalArrayDesc(applicationData[appTName].weekActivityTypes.dataPerVisit, 1);

          //Now create the label values for normal vals
          for (var aCounterType = 0; aCounterType < applicationData[appTName].weekActivityTypes.data.length; aCounterType++) {
            var dataRowType = applicationData[appTName].weekActivityTypes.data[aCounterType];

            applicationData[appTName].weekActivityTypes.labels.push(dataRowType[0] + ": " + dataRowType[1] + " (" +
              Math.round(dataRowType[1] / (applicationData[appTName].weekActivities.totalActivities || 1) * 100) + "%)");
          }

          //Now create the label values for vals per visit
          for (var aCounterTypeP = 0; aCounterTypeP < applicationData[appTName].weekActivityTypes.dataPerVisit.length; aCounterTypeP++) {
            var dataRowTypeP = applicationData[appTName].weekActivityTypes.dataPerVisit[aCounterTypeP];

            applicationData[appTName].weekActivityTypes.labelsPerVisit.push(dataRowTypeP[0] + ": " + dataRowTypeP[1] + " times per visit");
          }
        }


        //Assign overall activity values to data arrays used for chart
        for (var activityAll in allApplicationData.weekActivities.rawValues) {
          var dataIndexAll = allApplicationData.weekActivities.data.length;
          //Normal raw values
          allApplicationData.weekActivities.data.push([]);
          allApplicationData.weekActivities.data[dataIndexAll].push(activityAll);
          allApplicationData.weekActivities.data[dataIndexAll].push(allApplicationData.weekActivities.rawValues[activityAll]);
          //Make calulcations for data per visit
          allApplicationData.weekActivities.dataPerVisit.push([]);
          allApplicationData.weekActivities.dataPerVisit[dataIndexAll].push(activityAll);
          allApplicationData.weekActivities.dataPerVisit[dataIndexAll].push(roundTo2(allApplicationData.weekActivities.rawValues[activityAll] /
            (allApplicationData.totalVisitsForWeek || 1)));
        }

        //Sort into descending order
        sortNumericalArrayDesc(allApplicationData.weekActivities.data, 1);
        sortNumericalArrayDesc(allApplicationData.weekActivities.dataPerVisit, 1);

        //Now create the label values for normal vals
        allApplicationData.weekActivities.data.forEach(function (dataRow) {
          allApplicationData.weekActivities.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
            Math.round(dataRow[1] / (allApplicationData.weekActivities.totalActivities || 1) * 100) + "%)");
        });

        //Now create the label values for vals per visit
        allApplicationData.weekActivities.dataPerVisit.forEach(function (dataRow) {
          allApplicationData.weekActivities.labelsPerVisit.push(dataRow[0] + ": " + dataRow[1] + " times per visit");
        });

        //Assign overall activity type values to data arrays used for chart
        for (var activityAllType in allApplicationData.weekActivityTypes.rawValues) {
          var dataIndexAllType = allApplicationData.weekActivityTypes.data.length;
          //Normal raw values
          allApplicationData.weekActivityTypes.data.push([]);
          allApplicationData.weekActivityTypes.data[dataIndexAllType].push(activityAllType);
          allApplicationData.weekActivityTypes.data[dataIndexAllType].push(allApplicationData.weekActivityTypes.rawValues[activityAllType]);
          //Make calulcations for data per visit
          allApplicationData.weekActivityTypes.dataPerVisit.push([]);
          allApplicationData.weekActivityTypes.dataPerVisit[dataIndexAllType].push(activityAllType);
          allApplicationData.weekActivityTypes.dataPerVisit[dataIndexAllType].push(roundTo2(allApplicationData.weekActivityTypes.rawValues[activityAllType] /
            (allApplicationData.totalVisitsForWeek || 1)));
        }

        //Sort into descending order
        sortNumericalArrayDesc(allApplicationData.weekActivityTypes.data, 1);
        sortNumericalArrayDesc(allApplicationData.weekActivityTypes.dataPerVisit, 1);

        //Now create the label values for normal vals
        allApplicationData.weekActivityTypes.data.forEach(function (dataRow) {
          allApplicationData.weekActivityTypes.labels.push(dataRow[0] + ": " + dataRow[1] + " (" +
            Math.round(dataRow[1] / (allApplicationData.weekActivities.totalActivities || 1) * 100) + "%)");
        });

        //Now create the label values for vals per visit
        allApplicationData.weekActivityTypes.dataPerVisit.forEach(function (dataRow) {
          allApplicationData.weekActivityTypes.labelsPerVisit.push(dataRow[0] + ": " + dataRow[1] + " times per visit");
        });
      }

      //Now return the previous year's data
      return gaRequester.queryGA({
        "start-date": formatDateString(lastYearStartDate, "query"),
        "end-date": formatDateString(lastYearEndDate, "query"),
        "ids": ids,
        "dimensions": "ga:pageTitle,ga:yearMonth,ga:nthMonth,ga:eventLabel",
        "metrics": "ga:totalEvents",
        "filters": topPagesFilter + ";ga:eventLabel!=Victoria;ga:eventLabel!=Map;ga:eventLabel!=Imagery;ga:eventAction==click",
        "sort": "ga:pageTitle,ga:yearMonth,ga:nthMonth",
        "max-results": 10000
      });
    }).then(function (results) {
      if (results) {
        results.rows.forEach(function (dataRow) {
          /*Results structure -   dataRow[0] = appName
                                  dataRow[1] = year and month
                                  dataRow[2] = month Index
                                  dataRow[3] = eventLabel (Activity)
                                  dataRow[4] = No of times
          */
          //Add if values exist for this search type   
          var yearlyActivityType = retrieveActivityType(dataRow[3]);

          //Populate activity and activity type data
          if (!applicationData[dataRow[0]].yearActivities.rawValues[dataRow[3]]) {
            //if the search type is new, map in 0s for each month
            applicationData[dataRow[0]].yearActivities.rawValues[dataRow[3]] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }

          if (!applicationData[dataRow[0]].yearActivityTypes.rawValues[yearlyActivityType]) {
            //if the search type is new, map in 0s for each month
            applicationData[dataRow[0]].yearActivityTypes.rawValues[yearlyActivityType] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }

          //Map in value to search type / month index combination
          applicationData[dataRow[0]].yearActivities.rawValues[dataRow[3]][+dataRow[2]] = (+dataRow[4]);
          applicationData[dataRow[0]].yearActivityTypes.rawValues[yearlyActivityType][+dataRow[2]] += (+dataRow[4]);

          //Add to monthly totals
          applicationData[dataRow[0]].yearActivities.monthTotals[+dataRow[2]] += (+dataRow[4]);


          if (!allApplicationData.yearActivities.rawValues[dataRow[3]]) {
            allApplicationData.yearActivities.rawValues[dataRow[3]] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }


          allApplicationData.yearActivities.rawValues[dataRow[3]][+dataRow[2]] += (+dataRow[4]);

          //Add to total value
          if (!allApplicationData.yearActivityTypes.rawValues[yearlyActivityType]) {
            allApplicationData.yearActivityTypes.rawValues[yearlyActivityType] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }


          allApplicationData.yearActivityTypes.rawValues[yearlyActivityType][+dataRow[2]] += (+dataRow[4]);

          //Add to monthly totals
          allApplicationData.yearActivities.monthTotals[+dataRow[2]] += (+dataRow[4]);


        });

        //Assign the values to data arrays used for chart
        for (var appYName in applicationData) {

          //Assign the values to data arrays used for chart
          for (var activity in applicationData[appYName].yearActivities.rawValues) {
            var dataIndex = applicationData[appYName].yearActivities.data.length;

            //Need to convert raw values to percentgaes
            applicationData[appYName].yearActivities.data.push([]);
            applicationData[appYName].yearActivities.data[dataIndex].push(activity);

            //Loop through each month values and map into data array
            for (var monthCounter = 0; monthCounter < 12; monthCounter++) {
              //Convert to percentage of total
              applicationData[appYName].yearActivities.data[dataIndex].push(roundTo2(applicationData[appYName].yearActivities.rawValues[activity][monthCounter] /
                (applicationData[appYName].yearActivities.monthTotals[monthCounter] || 1) * 100));

            }
          }

          //Assign the values to data arrays used for chart
          for (var activityType in applicationData[appYName].yearActivityTypes.rawValues) {
            var dataIndexType = applicationData[appYName].yearActivityTypes.data.length;

            //Need to convert raw values to percentgaes
            applicationData[appYName].yearActivityTypes.data.push([]);
            applicationData[appYName].yearActivityTypes.data[dataIndexType].push(activityType);

            //Loop through each month values and map into data array
            for (var monthCounterType = 0; monthCounterType < 12; monthCounterType++) {
              //Convert to percentage of total
              applicationData[appYName].yearActivityTypes.data[dataIndexType].push(roundTo2(applicationData[appYName].yearActivityTypes.rawValues[activityType][monthCounterType] /
                (applicationData[appYName].yearActivities.monthTotals[monthCounterType] || 1) * 100));

            }
          }
        }

        //Assign the values to data arrays used for chart
        for (var activityAll in allApplicationData.yearActivities.rawValues) {
          var dataIndexAll = allApplicationData.yearActivities.data.length;

          //Need to convert raw values to percentgaes
          allApplicationData.yearActivities.data.push([]);
          allApplicationData.yearActivities.data[dataIndexAll].push(activityAll);

          //Loop through each month values and map into data array
          for (var monthCounterAll = 0; monthCounterAll < 12; monthCounterAll++) {
            //Convert to percentage of total
            allApplicationData.yearActivities.data[dataIndexAll].push(roundTo2(allApplicationData.yearActivities.rawValues[activityAll][monthCounterAll] /
              (allApplicationData.yearActivities.monthTotals[monthCounterAll] || 1) * 100));

          }
        }

        //Assign the values to data arrays used for chart
        for (var activityTypeAll in allApplicationData.yearActivityTypes.rawValues) {
          var dataIndexTypeAll = allApplicationData.yearActivityTypes.data.length;

          //Need to convert raw values to percentgaes
          allApplicationData.yearActivityTypes.data.push([]);
          allApplicationData.yearActivityTypes.data[dataIndexTypeAll].push(activityTypeAll);

          //Loop through each month values and map into data array
          for (var monthCounterTypeAll = 0; monthCounterTypeAll < 12; monthCounterTypeAll++) {
            //Convert to percentage of total
            allApplicationData.yearActivityTypes.data[dataIndexTypeAll].push(roundTo2(allApplicationData.yearActivityTypes.rawValues[activityTypeAll][monthCounterTypeAll] /
              (allApplicationData.yearActivities.monthTotals[monthCounterTypeAll] || 1) * 100));

          }
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
 * Takes an activity label and returns its corresponding type
 * @params {string} activity -  the activity label
 * @return {string} the activity type
 */
function retrieveActivityType(activity) {
  "use strict";

  //Check that this is a string
  assert((typeof activity === "string" && activity !== ""), 'retrieveActivityType assert failed - activity: ' + activity);
  //Check that the lookup array is present
  assert(Array.isArray(clickLookupCategories), 'retrieveActivityType assert failed - clickLookupCategories array is not present');

  for (var categoryCounter = 0; categoryCounter < clickLookupCategories.length; categoryCounter++) {
    //loop through event_labels array and check for a match
    for (var labelCounter = 0; labelCounter < clickLookupCategories[categoryCounter].event_labels.length; labelCounter++) {
      if (clickLookupCategories[categoryCounter].event_labels[labelCounter] === activity) {
        return clickLookupCategories[categoryCounter].caption;
      }
    }
  }

  return "";
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

/*global window, document, Promise, console, topPagesFilter, topBrowsersFilter, startDate, endDate, ids, lastWeekStartDate, lastWeekEndDate  */
/*global lastYearStartDate, lastYearEndDate, currentWeekdayLabels, last12MonthsLabels,  YearlyDataLabels, allApplicationData, applicationData */
/*global APP_NAMES, APP_LABELS, topBrowsersArray, Masonry, formatDateString, C3StatsChart, assert, changeRetrievalDate, returnLastFullWeekDate, gapi */
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

  if (typeof loadType === "undefined") {
    loadType = "any";
  }

  //Clear any colour classes from the header
  for (var colCounter = 0; colCounter < headerColourClassList.length; colCounter++) {
    header.classList.remove(headerColourClassList[colCounter]);
  }


  if (hashURLIndex >= 0) {
    //If this is not a specific loading of the home screen, load the screen type 
    if (loadType !== "home") {
      showScreen(window.location.hash.substr(1));
    }

    //Update which links are active / inactive
    updateActiveLinks(window.location.hash.substr(1));

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


  } else {
    //If this is not a specific loading of a screen other than the home screen, load the screen type
    if (loadType !== "specific") {
      showHomeScreen();
    }

    //Update the active links
    updateActiveLinks("home");

    //Update title bar
    pageTitle.textContent = "LASSI applications usage stats and trends";

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
  Build the yearly page breakdown chart.  This is ONLY present for the overall chart. Relies on the data already being present within:
      allApplicationData.pageData
      
  */
  if (elementName === "overall") {
    columnData = [];
    nextChartORef = chartRefs.length;

    //Map in values for each page month combination to the series then add to the columnData
    for (var appCounter = 0; appCounter < APP_NAMES.length; appCounter++) {
      //Create data set
      columnData.push([]);
      //Add name for data set
      columnData[columnData.length - 1].push(APP_LABELS[appCounter]);
      //add data set to chart column data
      Array.prototype.push.apply(columnData[columnData.length - 1], chartDataArray.pageData[APP_NAMES[appCounter]]);
    }


    //Create the DOM element 
    createElement('yearly-pages-overall-card',
      cardClassesFull,
      '<div class="card-top-spacer"></div>' +
      '<div class="mdl-typography--title chart-title">Application breakdown trend</div>' +
      '<button id="yearly-pages-overall-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon area-chart"><i class="material-icons">equalizer</i></button>' +
      '<div class="mdl-tooltip" for="yearly-pages-overall-button">Switch between stacked bar chart and grouped bar chart</div>' +
      '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
      '<div id="yearly-pages-overall"></div>' +
      '</div>',
      //<button id="yearly-pages-overall-button">Change overall yearly pages chart</button>',
      'yearly-pages-overall-button',
      "transformVerticalStackedGrouped", nextChartORef, docFragment);

    chartRefs[nextChartORef] = new C3StatsChart(columnData, 'yearly-pages-overall', last12MonthsLabels, APP_LABELS);
    //chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of visits");

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
    '<div class="mdl-typography--title chart-title">Overall visits for the week</div>' +
    '<button id="weekly-users-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon area-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="weekly-users-' + elementName + '-button">Switch between line chart and bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-users-' + elementName + '"></div>' +
    '</div>',

    //<button id="weekly-users-' + elementName + '-button">Change ' + elementName + ' weekly users chart</button>',
    'weekly-users-' + elementName + '-button',
    "transformArea", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-users-" + elementName);
  //chartRefs[nextChartORef].createWeekDayAreaChart();


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
    '<div class="mdl-typography--title chart-title">Overall visit trend</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-users-' + elementName + '"></div>' +
    '</div>');

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-users-" + elementName, last12MonthsLabels);
  //chartRefs[nextChartORef].createStaticVerticalTwoSeriesBarChart();




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
    '<div class="mdl-typography--title chart-title">Overall duration of visits for the week</div>' +
    '<button id="weekly-sessions-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon area-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="weekly-sessions-' + elementName + '-button">Switch between line chart and bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-sessions-' + elementName + '"></div>' +
    '</div>',

    //<button id="weekly-sessions-' + elementName + '-button">Change ' + elementName + ' weekly sessions chart</button>',
    'weekly-sessions-' + elementName + '-button',
    "transformArea", nextChartORef);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-sessions-" + elementName);
  //chartRefs[nextChartORef].createWeekDayAreaChart();

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
    '<div class="mdl-typography--title chart-title">Overall time between visits</div>' +
    '<button id="visitor-return-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="visitor-return-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="visitor-return-' + elementName + '"></div>' +
    '</div>',

    //<button id="visitor-return-' + elementName + '-button">Change ' + elementName + ' visitor return chart</button>',
    'visitor-return-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "visitor-return-" + elementName, dataLabels, seriesLabels);
  //chartRefs[nextChartORef].createHorizontalBarChart("Time to return");

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
    '<div class="mdl-typography--title chart-title">Overall map use trend</div>' +
    '<button id="yearly-maps-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="yearly-maps-' + elementName + '-button">Switch between stacked bar chart and grouped bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-maps-' + elementName + '"></div>' +
    '</div>',

    //<button id="yearly-maps-' + elementName + '-button">Change ' + elementName + ' yearly map types chart</button>',
    'yearly-maps-' + elementName + '-button',
    "transformVerticalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-maps-" + elementName, last12MonthsLabels, seriesLabels);
  //chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of map types");



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
    '<div class="mdl-typography--title chart-title">Overall map use for the week</div>' +
    '<button id="weekly-maps-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-maps-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-maps-' + elementName + '"></div>' +
    '</div>',

    //<button id="weekly-maps-' + elementName + '-button">Change ' + elementName + ' weekly map types chart</button>',
    'weekly-maps-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-maps-" + elementName, dataLabels, seriesLabels);
  //chartRefs[nextChartORef].createHorizontalBarChart("Map type");



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
    '<div class="mdl-typography--title chart-title">Overall searches trend</div>' +
    '<button id="yearly-search-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="yearly-search-' + elementName + '-button">Switch between stacked bar chart and grouped bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-search-' + elementName + '"></div>' +
    '</div>',

    //<button id="yearly-search-' + elementName + '-button">Change ' + elementName + ' yearly search chart</button>',
    'yearly-search-' + elementName + '-button',
    "transformVerticalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-search-" + elementName, last12MonthsLabels, seriesLabels);
  //chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of searches");



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
    '<div class="mdl-typography--title chart-title">Overall searches for the week</div>' +
    '<button id="weekly-search-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-search-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<button id="weekly-search-' + elementName +
    '-switch-to-per-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">subdirectory_arrow_right</i></button>' +
    '<div class="mdl-tooltip" for="weekly-search-' + elementName + '-switch-to-per-button">Switch to per visit values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-search-' + elementName + '"></div>' +
    '</div>',

    //<button id="weekly-search-' + elementName + '-button">Change ' + elementName + ' weekly search chart</button>' +
    //'<button id = "weekly-search-' + elementName + '-switch-to-per-button">Switch to per visit values</button>',
    'weekly-search-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);


  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-search-" + elementName, dataLabels, seriesLabels);
  //chartRefs[nextChartORef].createHorizontalBarChart("Search type");


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
    '<div class="mdl-typography--title chart-title">Overall searches per visit for the week</div>' +
    '<button id="weekly-search-per-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">view_carousel</i></button>' +
    '<div class="mdl-tooltip" for="weekly-search-per-' + elementName + '-button">Switch between separate values and stacked values</div>' +
    '<button id="weekly-search-' + elementName +
    '-switch-to-raw-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">subdirectory_arrow_left</i></button>' +
    '<div class="mdl-tooltip" for="weekly-search-' + elementName + '-switch-to-raw-button">Switch to raw values</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="weekly-search-per-' + elementName + '"></div>' +
    '</div>',

    //<button id="weekly-search-per-' + elementName + '-button">Change ' + elementName + ' weekly search chart</button>' +
    //'<button id = "weekly-search-' + elementName + '-switch-to-raw-button">Switch to absolute values</button>',
    'weekly-search-per-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-search-per-" + elementName, dataLabels, seriesLabels);
  //chartRefs[nextChartORef].createHorizontalBarChart("Search type");




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
    '<div class="mdl-typography--title chart-title">Overall activity types trend</div>' +
    '<button id="yearly-activity-types-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="yearly-activity-types-' + elementName + '-button">Switch between stacked bar chart and grouped bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-activity-types-' + elementName + '"></div>' +
    '</div>',

    //<button id="yearly-activity-types-' + elementName + '-button">Change overall yearly activity types chart</button>',
    'yearly-activity-types-' + elementName + '-button',
    "transformVerticalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-activity-types-" + elementName, last12MonthsLabels, seriesLabels);
  //chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of activities");

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
    '<div class="mdl-typography--title chart-title">Overall activity types for the week</div>' +
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

    /*<button id="weekly-activity-types-' + elementName + '-button">Change ' +
    elementName + ' weekly activity types chart</button>' +
    '<button id = "weekly-activity-types-' + elementName + '-switch-to-per-button">Switch to per visit values</button>' +
    '<button id = "weekly-activity-types-' + elementName + '-switch-to-raw-activities-button">Switch to detailed activity breakdown</button>',*/
    'weekly-activity-types-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activity-types-" + elementName, dataLabels, seriesLabels);
  //chartRefs[nextChartORef].createHorizontalBarChart("Activity type");


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
    '<div class="mdl-typography--title chart-title">Overall activity types per visit for the week</div>' +
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

    /*<button id="weekly-activity-types-per-' + elementName +
    '-button">Change ' + elementName + ' weekly activity types chart</button>' +
    '<button id = "weekly-activity-types-' + elementName + '-switch-to-raw-button">Switch to per visit values</button>' +
    '<button id = "weekly-activity-types-' + elementName + '-switch-to-per-activities-button">Switch to detailed activity breakdown</button>',*/
    'weekly-activity-types-per-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activity-types-per-" + elementName, dataLabels, seriesLabels);
  //chartRefs[nextChartORef].createHorizontalBarChart("Activity type");




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
    '<div class="mdl-typography--title chart-title">Overall activity breakdown for the week</div>' +
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

    /*<button id="weekly-activities-' + elementName +
    '-button">Change ' + elementName + ' weekly activities chart</button>' +
    '<button id = "weekly-activities-' + elementName + '-switch-to-per-button">Switch to per visit values</button>' +
    '<button id = "weekly-activities-' + elementName + '-switch-to-raw-activity-types-button">Switch to activity type breakdown</button>',*/
    'weekly-activities-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activities-" + elementName, dataLabels, seriesLabels);
  //chartRefs[nextChartORef].createHorizontalBarChart("Activity");


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
    '<div class="mdl-typography--title chart-title">Overall activity breakdown per visit for the week</div>' +
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

    /*          <button id="weekly-activities-per-' + elementName +
    '-button">Change ' + elementName + ' weekly activities per visit chart</button>' +
    '<button id = "weekly-activities-' + elementName + '-switch-to-raw-button">Switch to absolute values</button>' +
    '<button id = "weekly-activities-' + elementName + '-switch-to-per-activity-types-button">Switch to activity type breakdown</button>',*/
    'weekly-activities-per-' + elementName + '-button',
    "transformHorizontalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "weekly-activities-per-" + elementName, dataLabels, seriesLabels);
  //chartRefs[nextChartORef].createHorizontalBarChart("Activity");






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
    cardClassesFull,
    '<div class="card-top-spacer"></div>' +
    '<div class="mdl-typography--title chart-title">Overall browser usage trend</div>' +
    '<button id="yearly-browsers-' + elementName +
    '-button" class="mdl-button mdl-js-button mdl-button--icon chart-icon stacked-chart"><i class="material-icons">equalizer</i></button>' +
    '<div class="mdl-tooltip" for="yearly-browsers-' + elementName + '-button">Switch between stacked bar chart and grouped bar chart</div>' +
    '<div class="card-bottom-spacer"></div><div class="mdl-card__actions mdl-card--border">' +
    '<div id="yearly-browsers-' + elementName + '"></div>' +
    '</div>',

    //<button id="yearly-browsers-' + elementName + '-button">Change ' + elementName + ' yearly browsers chart</button>',
    'yearly-browsers-' + elementName + '-button',
    "transformVerticalStackedGrouped", nextChartORef, docFragment);

  chartRefs[nextChartORef] = new C3StatsChart(columnData, "yearly-browsers-" + elementName, last12MonthsLabels, topBrowsersArray);
  //chartRefs[nextChartORef].createStackedVerticalBarChart("Percentage of visits");

  /*
    //Layout the screen with charts
    refreshCharts();
    msnry.layout();*/

  //parentElement.appendChild(docFragment);

  for (var cCounter = 0; cCounter < chartRefs.length; cCounter++) {
    var elId = chartRefs[cCounter].pageElement;

    if (elId.startsWith("yearly-pages-overall")) {
      chartRefs[cCounter].createStackedVerticalBarChart("Percentage of visits");
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
