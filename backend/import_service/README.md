# Import Service

## Description
The Import Service is a Node.js application designed to handle the import of product data into an e-commerce platform. It leverages AWS Lambda functions and API Gateway to provide a serverless architecture for managing product imports. The service includes endpoints for generating pre-signed URLs for uploading CSV files and processing the uploaded files to import product data. This project serves as a foundation for building scalable and efficient serverless applications on AWS.

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [AWS CDK](https://aws.amazon.com/cdk/) installed on your machine.

### Installation
1. Clone the repository:
   ```sh
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```sh
   cd backend/import_service
   ```
3. Install the dependencies:
   ```sh
   npm install
   ```

### AWS Configuration

#### Prerequisites
Before deploying this application, you need to configure your AWS credentials. Make sure you have:
- AWS CLI installed (`npm install -g aws-cdk`)
- An AWS account
- Access Key ID and Secret Access Key with appropriate permissions

### Configure AWS Credentials
1. Run AWS configure command:
   ```bash
   aws configure
   AWS Access Key ID [None]: YOUR_ACCESS_KEY [[1]](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-net-applications-security/iam-development.html)
   AWS Secret Access Key [None]: YOUR_SECRET_KEY [[2]](https://docs.aws.amazon.com/toolkit-for-visual-studio/latest/user-guide/deployment-beanstalk-specify-credentials.html)
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

### CDK Bootstrap

Before deploying CDK applications for the first time in an AWS environment (account/region), you need to bootstrap the environment:

```bash
cdk bootstrap
```

### Deploying the Application
Deploy the application to AWS using the following command:
```sh
npm run cdk:deploy
```

### Synthesizing the CloudFormation Template
To synthesize the CloudFormation template, use the following command:
```sh
npm run cdk:synth
```

### Destroying the Application
To destroy the deployed application, use the following command:
```sh
npm run cdk:destroy
```

### Running the Application Locally
To start the application locally, you can use the following command:
```sh
npm start
```

### Other Commands

#### Linting the Code
To check the code for any linting errors, run:
```sh
npm run lint
```

#### Run all tests
```sh
npm test
```

#### Run tests with coverage report
```sh
npm run test:coverage
```

#### Run tests in watch mode during development
```sh
npm run test:watch
```

#### Building the Project
To compile the TypeScript code to JavaScript, run:
```sh
npm run build
```

### API Endpoints
Once deployed, you can access the API at the URL provided in the CloudFormation output. The available endpoints are:
- `GET /import`: Retrieves the import URL for uploading a CSV file.
- `POST /import`: Processes the uploaded CSV file.

## Project Structure
```
src/
   bin/
      import_service.ts - Entry point for the AWS CDK application.
   handlers/
      importProductsFile.ts - Lambda function handler for retrieving the import URL.
      importFileParser.ts - Lambda function handler for processing the uploaded CSV file.
   lib/
      import-service-stack.ts - Defines the AWS infrastructure stack for the import service.
   mock/
      mockData.ts - Contains mock data for testing purposes.
node_modules/ - Contains the project's dependencies.
test/
   import-service.test.ts - Unit tests for the import service.
cdk.json - Configuration file for AWS CDK.
package.json - Defines the project's dependencies and scripts.
README.md - Provides an overview and documentation for the project.
tsconfig.json - TypeScript configuration file.
```

## Contributing
Feel free to submit issues or pull requests to improve the project.

## License
This project is licensed under the ISC License.

## API Documentation
The API documentation is available in OpenAPI (Swagger) format:
- YAML version: [openapi.yaml](docs/openapi.yaml)
- JSON version: [openapi.json](docs/openapi.json)

You can view and test the API using [Swagger Editor](https://editor.swagger.io/)
by copying the content of either file.

### Available Endpoints

#### GET /import
- **Description**: Retrieves the import URL for uploading a CSV file.
- **Response**: A pre-signed URL for uploading the CSV file.
- **Example Response**:
  ```json
  {
    "url": "https://bucket-name.s3.amazonaws.com/uploaded/import.csv?AWSAccessKeyId=AKIA...&Expires=1609459200&Signature=..."
  }
  ```

#### POST /import
- **Description**: Processes the uploaded CSV file.
- **Request Body**: CSV file content.
- **Response**: A success message.
- **Error Responses**: 
  - `400 Bad Request`: When the CSV file is invalid.
- **Example Response**:
  ```json
  {
    "message": "File processed successfully"
  }
  ```