module.exports = wrapAsync;

function wrapAsync(fn) {
    return function(req, res, next) {
        fn(req, res, next).catch((err) => next(err));
    };
}
// This utility function takes an asynchronous function (fn) as an argument
// and returns a new function that wraps the original function in a try-catch block.
// If the original function throws an error, it is caught and passed to the next middleware
// in the Express.js application, allowing for centralized error handling.