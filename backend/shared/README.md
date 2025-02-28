# Shared Module

Version: 1.0.0

## Description
The Shared Module provides common utilities, types, and configurations that are shared across multiple services in the AWS Shop Backend. It includes reusable components for AWS Lambda function handling, CORS configuration, and common types definitions.

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [AWS CDK](https://aws.amazon.com/cdk/) installed on your machine.

### Installation
1. Clone the repository:
   ```sh
   git clone <repository-url>
   ```
2. Navigate to the shared module directory:
   ```sh
   cd backend/shared
   ```
3. Install the dependencies:
   ```sh
   npm install
   ```

## AWS Configuration

### Prerequisites
Before using this module with AWS services, you need to configure your AWS credentials. Make sure you have:
- AWS CLI installed (`npm install -g aws-cdk`)
- An AWS account
- Access Key ID and Secret Access Key with appropriate permissions

### Configure AWS Credentials
1. Run AWS configure command:
   ```bash
   aws configure
   AWS Access Key ID [None]: YOUR_ACCESS_KEY
   AWS Secret Access Key [None]: YOUR_SECRET_KEY
   Default region name [None]: us-east-1
   Default output format [None]: json

   # Verify configuration
   aws configure list

   # Configure named profiles (optional)
   aws configure --profile dev
   aws configure --profile prod

   # Use specific profile
   aws configure list --profile dev
   ```

## Usage
The shared module is designed to be used as an internal dependency by other services in the project.

### Using the Shared Module in Another Service

1. Reference the shared module in your service's package.json:
   ```json
   "dependencies": {
     "shared": "file:../shared"
   }
   ```

2. Import shared utilities in your service code:
   ```typescript
   import { lambdaHandler } from 'shared';
   import { CORS_HEADERS } from 'shared';
   ```

## Dependencies
The shared module depends on the following packages:

- **@types/node**: ^22.13.5
- **aws-lambda**: ^1.0.7
- **dotenv**: ^16.4.7

Main entry point: index.js
TypeScript definitions: index.d.ts

## Module Components

### Lambda Handler
The `lambdaHandler` utility provides a wrapper for AWS Lambda functions to handle common tasks such as error handling, logging, and response formatting.

Example usage:
```typescript
import { lambdaHandler } from 'shared';

export const handler = lambdaHandler(async (event) => {
  // Your business logic here
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success' })
  };
});
```

### CORS Configuration
The `cors.ts` module provides CORS headers and configuration for use in API responses.

Example usage:
```typescript
import { CORS_HEADERS } from 'shared';

export const handler = async (event) => {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ message: 'Success' })
  };
};
```

### Configuration
The `config.ts` module provides access to environment variables and configuration settings.

Example usage:
```typescript
import { getConfig } from 'shared';

const { REGION, STAGE } = getConfig();
```

### Constants
The `constants.ts` file provides common constants used across services.

### Types
The `types.ts` file contains TypeScript type definitions that are shared across services.

### Utilities
The `utils.ts` file contains general utility functions that can be used across services.

## Development

### Building the Module
To compile the TypeScript code to JavaScript, run:
```sh
npm run build
```

### Running the Module Locally
Since this is a shared library rather than a standalone application, you typically won't run it directly. Instead, you'll use it within other services that reference it as a dependency.

### Other Commands

#### Linting the Code
To check the code for any linting errors, run:
```sh
npm run lint
```

#### Running Tests
To run tests for the shared module:
```sh
npm test
```

To run tests with coverage report:
```sh
npm run test:coverage
```

## Project Structure
```
shared/
├── package.json       # Module dependencies and scripts
├── index.js           # Main entry point for the module
├── index.d.ts         # TypeScript declaration file
└── src/               # Source code directory
    ├── config.ts      # Configuration and environment variables
    ├── constants.ts   # Shared constants
    ├── cors.ts        # CORS configuration
    ├── lambdaHandler.ts  # Lambda function wrapper
    ├── types.ts       # Shared TypeScript types
    └── utils.ts       # Utility functions
```

## Contributing
When making changes to the shared module, ensure you update any dependent services and test thoroughly to avoid breaking changes.

## Integration with Services
The shared module is used by various services in the AWS Shop Backend:
- Product Service: For Lambda handlers, CORS configuration, and types
- Import Service: For common utilities and configurations

When making changes to this module, make sure to test the integration with all services that depend on it.