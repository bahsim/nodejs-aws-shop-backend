# Product Service

## Description
The Product Service is a Node.js application designed to manage products in an e-commerce platform. It leverages AWS Lambda functions and API Gateway to provide a serverless architecture for handling product-related operations. The service includes endpoints for creating, retrieving, updating, and deleting products, as well as seeding the database with initial data. This project serves as a foundation for building scalable and efficient serverless applications on AWS.

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
Once deployed, you can access the API at the URL provided in the CloudFormation output. The available endpoints are:
- `GET /products`: Retrieves the list of products.
- `GET /products/{productId}`: Retrieves a specific product by ID.
- `POST /products`: Creates a new product.
- `PUT /products/{productId}`: Updates an existing product by ID.

## Project Structure
```
src/
   bin/
      product_service.ts - Entry point for the AWS CDK application.
   handlers/
      getProductsList.ts - Lambda function handler for retrieving the list of products.
      getProductsById.ts - Lambda function handler for retrieving a product by ID.
      createProduct.ts - Lambda function handler for creating a new product.
      updateProduct.ts - Lambda function handler for updating an existing product.
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

### Available Endpoints

#### GET /products
- **Description**: Retrieves a list of all products.
- **Response**: An array of product objects.
- **Example Response**:
  ```json
  [
    {
      "id": "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
      "title": "Product 1",
      "description": "Description for Product 1",
      "price": 24.99,
      "count": 10
    },
    {
      "id": "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
      "title": "Product 2",
      "description": "Description for Product 2",
      "price": 15.45,
      "count": 5
    }
  ]
  ```

#### GET /products/{productId}
- **Description**: Retrieves a specific product by ID.
- **Parameters**: 
  - `productId` (path): The unique identifier for the product.
- **Response**: A single product object.
- **Error Responses**: 
  - `404 Not Found`: When the product with the specified ID does not exist.
- **Example Response**:
  ```json
  {
    "id": "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    "title": "Product 1",
    "description": "Description for Product 1",
    "price": 24.99,
    "count": 10
  }
  ```

#### POST /products
- **Description**: Creates a new product.
- **Request Body**: Product object without an ID.
- **Response**: The created product object with a generated ID.
- **Error Responses**: 
  - `400 Bad Request`: When the product data is invalid.
- **Example Request**:
  ```json
  {
    "title": "New Product",
    "description": "Description for New Product",
    "price": 19.99,
    "count": 15
  }
  ```
- **Example Response**:
  ```json
  {
    "id": "7567ec4b-b10c-48c5-9345-fc73c48a80a7",
    "title": "New Product",
    "description": "Description for New Product",
    "price": 19.99,
    "count": 15
  }
  ```

#### PUT /products/{productId}
- **Description**: Updates an existing product by ID.
- **Parameters**: 
  - `productId` (path): The unique identifier for the product.
- **Request Body**: Product object with updated data.
- **Response**: The updated product object.
- **Error Responses**: 
  - `400 Bad Request`: When the product data is invalid.
  - `404 Not Found`: When the product with the specified ID does not exist.
- **Example Request**:
  ```json
  {
    "title": "Updated Product",
    "description": "Updated description for Product",
    "price": 29.99,
    "count": 20
  }
  ```
- **Example Response**:
  ```json
  {
    "id": "7567ec4b-b10c-48c5-9345-fc73c48a80a7",
    "title": "Updated Product",
    "description": "Updated description for Product",
    "price": 29.99,
    "count": 20
  }
  ```
