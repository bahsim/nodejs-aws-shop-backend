interface AuthorizerEvent {
  authorizationToken: string;
  methodArn: string;
}

interface Credentials {
  username: string;
  password: string;
}

interface PolicyDocument {
  principalId: string;
  policyDocument: {
    Version: string;
    Statement: Array<{
      Action: string;
      Effect: string;
      Resource: string;
    }>;
  };
}

/**
 * Basic authorizer function for AWS Lambda to handle custom authorization.
 *
 * @param {AuthorizerEvent} event - The event object containing the authorization token.
 * @returns {Promise<object>} - A promise that resolves to an IAM policy or an error response.
 *
 * The function performs the following steps:
 * 1. Logs the incoming event.
 * 2. Checks if the authorization token is provided. If not, returns a 401 Unauthorized response.
 * 3. Decodes the credentials from the authorization token.
 * 4. Validates the credentials format. If invalid, returns a 401 Unauthorized response.
 * 5. Extracts the username and password from the decoded credentials.
 * 6. Retrieves the stored password for the given username from environment variables.
 * 7. If the username is not found, returns a 403 Forbidden response.
 * 8. Compares the provided password with the stored password.
 * 9. If the passwords match, generates an IAM policy with "Allow" effect.
 * 10. If the passwords do not match, returns a 403 Forbidden response.
 * 11. Catches any errors during the process and returns a 500 Internal Server Error response.
 *
 * @throws {Error} If an unexpected error occurs during authorization.
 */
export const basicAuthorizer = async (event: AuthorizerEvent) => {
  console.log("Event:", JSON.stringify(event));

  if (!event.authorizationToken) {
    return generateErrorResponse(401, "Unauthorized: No token provided");
  }

  try {
    const credentials = decodeCredentials(event.authorizationToken);

    if (!credentials) {
      return generateErrorResponse(401, "Unauthorized: Invalid token format");
    }

    const { username, password } = credentials;
    const storedPassword = process.env[username];

    if (!storedPassword) {
      return generateErrorResponse(403, "Forbidden: User not found");
    }

    return storedPassword === password
      ? generatePolicy(username, "Allow", event.methodArn)
      : generateErrorResponse(403, "Forbidden: Invalid credentials");
  } catch (error) {
    console.error("Authorization error:", error);
    return generateErrorResponse(500, "Internal server error");
  }
};

/**
 * Generates an HTTP error response object.
 *
 * @param statusCode - The HTTP status code of the error response.
 * @param message - The error message to include in the response body.
 * @returns An object representing the HTTP error response with the specified status code and message.
 */
function generateErrorResponse(statusCode: number, message: string) {
  return {
    statusCode,
    body: JSON.stringify({ message }),
  };
}

/**
 * Decodes the Basic Authentication credentials from the provided authorization header.
 *
 * @param authHeader - The authorization header containing the Basic Authentication credentials.
 * @returns An object containing the username and password if decoding is successful, otherwise null.
 */
function decodeCredentials(authHeader: string): Credentials | null {
  try {
    const [, encodedCreds] = authHeader.split(" ");
    if (!encodedCreds) return null;

    const decodedCreds = Buffer.from(encodedCreds, "base64").toString("utf-8");
    const [username, password] = decodedCreds.split(":");

    return username && password ? { username, password } : null;
  } catch (error) {
    console.error("Error decoding credentials:", error);
    return null;
  }
}

/**
 * Generates an IAM policy document.
 *
 * @param principalId - The principal user identifier associated with the policy.
 * @param effect - The effect of the policy, either "Allow" or "Deny".
 * @param resource - The resource ARN to which the policy applies.
 * @returns The generated policy document.
 */
function generatePolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string
): PolicyDocument {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
