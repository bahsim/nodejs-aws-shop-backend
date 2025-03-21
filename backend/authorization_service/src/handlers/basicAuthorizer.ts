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
  context?: {
    statusCode: number;
    message?: string;
  };
}

interface Context {
  callbackWaitsForEmptyEventLoop: boolean;
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: number;
  awsRequestId: string;
  logGroupName: string;
  logStreamName: string;
  getRemainingTimeInMillis(): number;
}

type Callback<TResult = any> = (
  error?: Error | string | null,
  result?: TResult
) => void;

/**
 * Basic authorizer function for AWS API Gateway.
 *
 * @param event - The event object containing the authorization token and other details.
 * @param _context - The context object (not used in this function).
 * @param callback - The callback function to return the authorization result.
 *
 * @returns void
 *
 * This function performs basic authorization by decoding the credentials from the authorization token,
 * checking the username and password against stored environment variables, and generating an appropriate
 * IAM policy to allow or deny access.
 *
 * If the authorization token is missing or invalid, the function returns an "Unauthorized" error.
 * If the credentials are valid, the function returns an IAM policy with "Allow" or "Deny" effect based on the
 * password match.
 *
 * @throws Will return an "Error" if an exception occurs during the process.
 */
export const basicAuthorizer = (
  event: AuthorizerEvent,
  _context: Context,
  callback: Callback
): void => {
  console.log("Event:", JSON.stringify(event));

  if (
    !event.authorizationToken ||
    event.authorizationToken === "null" ||
    event.authorizationToken === ""
  ) {
    return callback(
      null,
      generatePolicy("user", "Deny", event.methodArn, "unauthorized")
    );
  }

  try {
    const credentials = decodeCredentials(event.authorizationToken);

    if (!credentials) {
      return callback(
        null,
        generatePolicy("user", "Deny", event.methodArn, "unauthorized")
      );
    }

    const { username, password } = credentials;

    if (!username || !password) {
      return callback(
        null,
        generatePolicy("user", "Deny", event.methodArn, "unauthorized")
      );
    }

    const storedPassword = process.env[username];

    if (!storedPassword || storedPassword !== password) {
      return callback(
        null,
        generatePolicy(username, "Deny", event.methodArn, "forbidden")
      );
    }

    return callback(null, generatePolicy(username, "Allow", event.methodArn));
  } catch (error) {
    return callback("Error");
  }
};

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
    const [username, password] = decodedCreds.split("=");

    return username && password ? { username, password } : null;
  } catch (error) {
    console.error("Error decoding credentials:", error);
    return null;
  }
}

/**
 * Generates an IAM policy document for API Gateway authorizer.
 *
 * @param principalId - The principal user identifier associated with the token.
 * @param effect - The effect of the policy, either "Allow" or "Deny".
 * @param resource - The API Gateway resource ARN that the policy applies to.
 * @param authError - Optional parameter to specify the type of authorization error, either "unauthorized" or "forbidden".
 * @returns A policy document object containing the principalId, policyDocument, and context with a message and statusCode.
 */
function generatePolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string,
  authError?: "unauthorized" | "forbidden"
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
    context: {
      message:
        effect === "Allow"
          ? "Successfully authenticated"
          : authError === "unauthorized"
          ? "Unauthorized: Invalid credentials"
          : "Forbidden: Access denied",
      statusCode:
        effect === "Allow" ? 200 : authError === "unauthorized" ? 401 : 403,
    },
  };
}
