export class NhentaiError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "NhentaiError";
    this.status = status;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof NhentaiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong talking to nhentai.";
}
