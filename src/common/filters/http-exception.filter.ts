import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = "Internal server error";
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object") {
        const responseObj = exceptionResponse as any;

        if (responseObj.message) {
          if (Array.isArray(responseObj.message)) {
            message = this.getStatusMessage(status);
            errors = this.formatValidationErrors(responseObj.message);
          } else {
            message = responseObj.message;
          }
        }

        if (responseObj.error) {
          message = responseObj.error;
        }
      }
    }

    response.status(status).json({
      success: false,
      message,
      ...(errors && { errors }),
    });
  }

  private getStatusMessage(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "Validation failed";
      case HttpStatus.UNAUTHORIZED:
        return "Authentication required";
      case HttpStatus.FORBIDDEN:
        return "Access denied";
      case HttpStatus.NOT_FOUND:
        return "Resource not found";
      case HttpStatus.CONFLICT:
        return "Resource already exists";
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return "Internal server error";
      default:
        return "An error occurred";
    }
  }

  private formatValidationErrors(
    messages: string[] | any[],
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    messages.forEach((msg) => {
      if (typeof msg === "string") {
        const match = msg.match(/^(\w+)\s+(.+)$/);
        if (match) {
          const field = match[1];
          const error = match[2];
          if (!errors[field]) {
            errors[field] = [];
          }
          errors[field].push(error);
        } else {
          if (!errors["general"]) {
            errors["general"] = [];
          }
          errors["general"].push(msg);
        }
      } else if (msg && typeof msg === "object" && msg.constraints) {
        const field = msg.property;
        if (!errors[field]) {
          errors[field] = [];
        }
        Object.values(msg.constraints).forEach((constraint: any) => {
          errors[field].push(constraint);
        });
      }
    });

    return errors;
  }
}
