/**
 * Express 错误处理中间件
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';

/**
 * 错误响应格式
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    context?: Record<string, unknown>;
    stack?: string;
  };
}

/**
 * 格式化错误响应
 */
export function formatErrorResponse(error: AppError, includeStack = false): ErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      ...(includeStack && { stack: error.stack }),
    },
  };
}

/**
 * Express 错误处理中间件
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 如果是已知的 AppError
  if (err instanceof AppError) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const response = formatErrorResponse(err, isDevelopment);

    // 记录错误（将来集成 winston）
    console.error(`[${err.code}] ${err.message}`, err.context);

    res.status(err.statusCode).json(response);
    return;
  }

  // 未知错误（非 AppError）
  console.error('Unhandled error:', err);

  const unknownError = new AppError(
    ErrorCodes.UNKNOWN_ERROR,
    err.message || 'An unexpected error occurred',
    { originalError: err.message },
    false // 非操作性错误
  );

  const isDevelopment = process.env.NODE_ENV === 'development';
  const response = formatErrorResponse(unknownError, isDevelopment);

  res.status(500).json(response);
}

/**
 * 异步路由处理器包装器（捕获 Promise 错误）
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 处理器
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new AppError(
    ErrorCodes.NOT_FOUND,
    `Route not found: ${req.method} ${req.path}`,
    { method: req.method, path: req.path }
  );
  next(error);
}
