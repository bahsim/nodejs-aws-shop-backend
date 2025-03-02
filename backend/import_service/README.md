# Import Service

## Description
A microservice that handles importing products from CSV files via S3. The service consists of two Lambda functions: one for generating presigned URLs for file upload and another for parsing uploaded CSV files and storing them in the appropriate S3 location.

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or later) and [AWS CDK](https://aws.amazon.com/cdk/) installed on your machine.

### Installation
1. Clone the repository:
   ```sh
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```sh
   cd backend/import_service
   ```
3. Install dependencies:
   ```sh
   npm install
   ```

### AWS Configuration

#### Prerequisites
Before deploying this application, you need to configure your AWS credentials. Make sure you have:
- AWS CLI installed
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

### Building the Project
To compile the TypeScript code to JavaScript, run:
```sh
npm run build
```

### Watch Mode for Development
For continuous compilation during development:
```sh
npm run watch
```

### Running Tests
Run all tests:
```sh
npm test
```

### API Endpoints
Once deployed, you can access the API at the URL provided in the CloudFormation output. The available endpoints are:

- `GET /import`: Generates a presigned URL for uploading CSV files to S3.
- `S3 Event Trigger`: An S3 event trigger processes uploaded CSV files automatically.

## Project Structure
```
import-service/
├── src/
│   ├── bin/
│   │   └── import-service.ts     # Entry point for the AWS CDK application
│   ├── handlers/                 # Lambda function handlers
│   │   ├── importProductsFile.ts # Handler for generating presigned URLs
│   │   └── importFileParser.ts   # Handler for parsing CSV files
│   └── lib/
│       └── import-service-stack.ts # Defines the AWS infrastructure stack
├── package.json                  # Project dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── cdk.json                      # CDK configuration
└── README.md                     # Project documentation
```

## Contributing
Feel free to submit issues or pull requests to improve the project.

## License
This project is licensed under the ISC License.

## API Documentation
The API documentation is available in OpenAPI (Swagger) format. You can view and test the API using [Swagger Editor](https://editor.swagger.io/).

### Available Endpoints

#### GET /import
- **Description**: Generates a presigned URL for uploading CSV files to S3.
- **Query Parameters**: 
  - `name` (required): The name of the file to be uploaded.
- **Response**: A presigned URL string that can be used to upload the file.
- **Error Responses**: 
  - `400 Bad Request`: When the file name is not provided.
- **Example Response**:
  ```json
  {
    "url": "https://XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/uploaded/filename.csv?AWSAccessKeyId=..."
  }
  ```

#### S3 Event Processing
- **Description**: Automatically triggered when a file is uploaded to the S3 bucket in the "uploaded" folder.
- **Process**: 
  1. Reads the CSV file content
  2. Processes each row
  3. Moves the processed file from the "uploaded" folder to the "parsed" folder