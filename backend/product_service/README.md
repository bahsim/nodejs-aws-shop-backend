# Product Service

## Description
This is a simple Node.js application that serves as a starting point for building your own applications. It includes an AWS Lambda function and an API Gateway to manage products.

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
   cd backend/product_service
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
Once deployed, you can access the API at the URL provided in the CloudFormation output. The available endpoint is:
- `GET /products`: Retrieves the list of products.

## Project Structure
```
src/
   bin/
      product_service.ts - Entry point for the AWS CDK application.
   handlers/
      getProductsList.ts - Lambda function handler for retrieving the list of products.
      getProductsById.ts - Lambda function handler for retrieving a product by ID.
      createProduct.ts - Lambda function handler for creating a new product.
      seedTables.ts - Lambda function handler for seeding the database tables.
   lib/
      products-service-stack.ts - Defines the AWS infrastructure stack for the product service.
   mock/
      mockData.ts - Contains mock data for testing purposes.
node_modules/ - Contains the project's dependencies.
test/
   products-service.test.ts - Unit tests for the product service.
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
