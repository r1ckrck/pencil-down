// A rule violation the API reports to the client with an HTTP status.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new ApiError(404, `${what} not found`);
export const badRequest = (msg: string) => new ApiError(400, msg);
export const conflict = (msg: string, extra: Record<string, unknown> = {}) => new ApiError(409, msg, extra);
