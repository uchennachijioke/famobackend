import type { NextFunction, Request, Response } from 'express';

// Wraps an async route handler so thrown errors reach Express' error handler
// instead of crashing the process with an unhandled rejection.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
