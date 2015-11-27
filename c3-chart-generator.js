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
            bottom: 20
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
            bottom: 20
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
                    width: 500
                }

            },
            y: {
                padding: {
                    left: 0
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

C3StatsChart.prototype.createStackedVerticalBarChart = function () {
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
            left: 130
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
                padding: {
                    left: 0
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
            height: chartHeight
        },
        padding: {
            bottom: 20,
            left: 130
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
        }



    });

    statsChartContext.rescaleHorizontal();
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
 * @param {None}
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
             "#FBBCBD", "#EEA8B5", "#AFD0F1"],
        14: ["#FF998E", "#89F1F5", "#C5CA69", "#D3C8F5", "#7BD39A", "#F49CC0", "#E9FFE5", "#F9A667", "#88C4E5", "#A1BEA7",
             "#ACBB7F", "#DEF0A2", "#9AB8CB", "#B1C0ED"],
        15: ["#D1DDF3", "#F6BF63", "#89C593", "#F9B7A9", "#F3F4D1", "#5CC5C2", "#C9D17B", "#C0FBF2", "#FCB1CD", "#CBF8B1",
             "#B4ACB9", "#F7DBA4", "#7FE4F4", "#DAA37E", "#D2C7F2"],
        16: ["#B0D2FE", "#EDCB65", "#F2989C", "#8EFCE5", "#AADC8D", "#E6E4DA", "#FACDA0", "#D19EC3", "#B1C292", "#5BC6B5",
             "#CBF6BE", "#ADBBD2", "#DDA37A", "#C0BF5F", "#FEE78C", "#F3B9D3"],
        17: ["#8DE5E1", "#F4A1AA", "#B8CC6E", "#C0BBE1", "#90EEAF", "#D0AC72", "#FFDAC9", "#DBE5EC", "#CCFACF", "#A8B37E",
             "#FBC1E0", "#87B9AB", "#F9DC98", "#BBF9A3", "#D3AFA6", "#76F4CA", "#F8ADB2"],
        18: ["#72CBCA", "#FBC06D", "#D8AEDE", "#BAEBA2", "#EAD9C1", "#F49C83", "#C3D56C", "#80FFE6", "#6DBE87", "#C6AEB3",
             "#EFF0AE", "#BDAE8C", "#D5EFCC", "#F0D190", "#FAD3F5", "#FEEFE9", "#96C989", "#D2B9E9"],
        19: ["#76F6E3", "#EEB965", "#D4B4E2", "#C9F69B", "#B4B498", "#FEABB4", "#92B1BB", "#EDD8D6", "#81C98E", "#F3EFB0",
             "#A7CCF5", "#E3A075", "#C1F6DC", "#68C5B4", "#E6D572", "#FFC590", "#E0FBBB", "#C4AF8E", "#F5DD86"],
        20: ["#C6E793", "#F39187", "#A0BCD5", "#6FD1B5", "#FACD8C", "#F8DAE1", "#B0F6F6", "#FDA06C", "#E8E775", "#B3B5B1",
             "#C5A880", "#C5BF6F", "#DBA29B", "#B2E9BD", "#FACFAB", "#91C481", "#E3A967", "#FFABAC", "#C8CCE9", "#AAD77A"]
    },
    smallSets: {
        2: ["#f57366", "#afe064"],
        3: ["#72a1cb", "#f57366", "#afe064"]

    }
};
