export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}
export class ForbiddenError extends Error {
  constructor() {
    super("forbidden");
    this.name = "ForbiddenError";
  }
}
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
export class ConfigError extends Error {
  constructor() {
    super("Housio is not connected to its database yet. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY.");
    this.name = "ConfigError";
  }
}

export function friendlyError(error: unknown): string {
  if (error instanceof UserError) return error.message;
  if (error instanceof ValidationError) return "Some details look incorrect. Please check the form and try again.";
  if (error instanceof ForbiddenError) return "You do not have permission to do that.";
  if (error instanceof UnauthorizedError) return "Your session has ended. Please sign in again.";
  if (error instanceof ConfigError) return error.message;
  return "Something went wrong. Please try again in a moment.";
}

/** An error whose message is safe and helpful to show to the user as-is. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
