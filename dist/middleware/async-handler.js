"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = asyncHandler;
// Wraps an async route handler so thrown errors reach Express' error handler
// instead of crashing the process with an unhandled rejection.
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
//# sourceMappingURL=async-handler.js.map