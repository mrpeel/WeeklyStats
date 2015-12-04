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
