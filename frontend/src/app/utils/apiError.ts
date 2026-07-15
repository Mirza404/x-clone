import axios from 'axios';

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = (error.response?.data as { message?: unknown })
      ?.message;

    if (typeof responseMessage === 'string') {
      return responseMessage;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export { getApiErrorMessage };
