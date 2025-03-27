// Helper function to validate the callback URL
export const isValidCallbackUrl = (url: string): boolean => {
  try {
    // If the URL is a relative URL, allow it.
    if (url.startsWith("/")) {
      return true;
    }

    // For an absolute URL, parse it.
    const parsedUrl = new URL(url);
    // Compare its hostname with your allowed hostname.
    const allowedHostname = process.env.APP_URL;
    return parsedUrl.hostname === allowedHostname;
  } catch (error) {
    // If URL parsing fails, it's invalid.
    return false;
  }
};
