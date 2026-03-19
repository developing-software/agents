import { z } from "zod";
import { ErrorResponse, ErrorCodes, VisibleError } from "@agents/core/error";
import { validator as zodValidator, resolver } from "hono-openapi";
import type { MiddlewareHandler, ValidationTargets } from "hono";
import { Actor } from "@agents/core/actor";
import { getTokens } from "./auth";

export function Result<T extends z.ZodType>(schema: T) {
  return resolver(
    z.object({
      data: schema,
    }),
  );
}

export const noop: MiddlewareHandler = (_c, next) => next();

export const authRequired: MiddlewareHandler = async (c, next) => {
  const hasAuthHeader = !!c.req.header("authorization");
  const cookies = await getTokens(c);
  if (!hasAuthHeader && !cookies.access)
    throw new VisibleError(
      "authentication",
      ErrorCodes.Authentication.UNAUTHORIZED,
      "Authentication required",
    );
  Actor.userID();
  return next();
};

/**
 * Custom validator wrapper around hono-openapi/zod validator that formats errors
 * according to our standard API error format
 */
export const validator = function <S extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: S,
) {
  const standardErrorHandler: Parameters<typeof zodValidator>[2] = (result, c) => {
    if (!result.success) {
      // Get the validation issues
      const issues = result.error || [];
      if (issues.length === 0) {
        // If there are no issues, return a generic error
        return c.json(
          {
            type: "validation",
            code: ErrorCodes.Validation.INVALID_PARAMETER,
            message: "Invalid request data",
          },
          400,
        );
      }

      // Get the first error for the main response
      const firstIssue = issues[0]!;
      const fieldPath = firstIssue.path
        ? Array.isArray(firstIssue.path)
          ? firstIssue.path.join(".")
          : firstIssue.path
        : undefined;

      // Map Zod error codes to our standard error codes
      let message = firstIssue.message;
      let errorCode = ErrorCodes.Validation.INVALID_PARAMETER;
      if (firstIssue.message === "invalid_type" && firstIssue.path?.at(0) === "undefined") {
        errorCode = ErrorCodes.Validation.MISSING_REQUIRED_FIELD;
        message = `The \`${firstIssue.path}\` field is required.`;
      } else if (["invalid_string", "invalid_date", "invalid_regex"].includes(firstIssue.message)) {
        errorCode = ErrorCodes.Validation.INVALID_FORMAT;
      }

      return c.json(
        {
          type: "validation",
          code: errorCode,
          message,
          param: fieldPath,
          details: {
            issues: issues.map((issue) => ({
              path: issue.path
                ? Array.isArray(issue.path)
                  ? issue.path.join(".")
                  : issue.path
                : undefined,
              message: issue.message,
              expected: issue.expected,
              received: issue.received,
            })),
          },
        },
        400,
      );
    }
  };

  // Use the original validator with our custom error handler
  return zodValidator(target, schema, standardErrorHandler);
};

/**
 * Standard error responses for OpenAPI documentation
 */
export const ErrorResponses = {
  400: {
    content: {
      "application/json": {
        schema: resolver(
          ErrorResponse.meta({
            description: "Validation error",
          }),
        ),
        example: {
          type: "validation",
          code: "invalid_parameter",
          message: "The request was invalid",
          param: "email",
        },
      },
    },
    description: "Bad Request",
  },
  401: {
    content: {
      "application/json": {
        schema: resolver(
          ErrorResponse.meta({
            description: "Authentication error",
          }),
        ),
        example: {
          type: "authentication",
          code: "unauthorized",
          message: "Authentication required",
        },
      },
    },
    description: "Unauthorized",
  },
  403: {
    content: {
      "application/json": {
        schema: resolver(
          ErrorResponse.meta({
            description: "Permission error",
          }),
        ),
        example: {
          type: "forbidden",
          code: "permission_denied",
          message: "You do not have permission to access this resource",
        },
      },
    },
    description: "Forbidden",
  },
  404: {
    content: {
      "application/json": {
        schema: resolver(
          ErrorResponse.meta({
            description: "Not found error",
          }),
        ),
        example: {
          type: "not_found",
          code: "resource_not_found",
          message: "The requested resource could not be found",
        },
      },
    },
    description: "Not Found",
  },
  429: {
    content: {
      "application/json": {
        schema: resolver(
          ErrorResponse.meta({
            description: "Rate limit error",
          }),
        ),
        example: {
          type: "rate_limit",
          code: "too_many_requests",
          message: "Rate limit exceeded",
        },
      },
    },
    description: "Too Many Requests",
  },
  500: {
    content: {
      "application/json": {
        schema: resolver(
          ErrorResponse.meta({
            description: "Server error",
          }),
        ),
        example: {
          type: "internal",
          code: "internal_error",
          message: "Internal server error",
        },
      },
    },
    description: "Internal Server Error",
  },
};
