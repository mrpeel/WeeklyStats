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
