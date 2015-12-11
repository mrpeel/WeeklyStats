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
    this.transitionDuration = 1500;
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
        },

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
    var chartHeight = statsChartContext.columnData.length * 45;
    if (chartHeight < 350) {
        chartHeight = 350;
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
            width: document.getElementById(statsChartContext.pageElement).clientWidth
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
        onresize: function () {
            //When window is resized, re-size the chart appropriately
            statsChartContext.chart.resize({
                height: chartHeight,
                width: document.getElementById(statsChartContext.pageElement).clientWidth
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
