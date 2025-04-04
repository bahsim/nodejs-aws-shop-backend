# BFF Service

## Description
The BFF (Backend for Frontend) Service acts as a gateway to interact with multiple backend services, such as the Cart Service and Product Service. It provides a unified API for the frontend, simplifying communication and reducing complexity.

## Features
- Proxy requests to the Cart and Product services.
- Caches responses for improved performance.
- Handles CORS and error responses.

## Getting Started

### Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (latest stable version recommended)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- [AWS CDK](https://aws.amazon.com/cdk/) installed globally:
  ```sh
  npm install -g aws-cdk
  ```

### Installation
1. Clone the repository:
   ```sh
   git clone <repository-url>
   ```
2. Navigate to the BFF Service directory:
   ```sh
   cd backend/bff-service
   ```
3. Install dependencies:
   ```sh
   npm install
   ```

### Environment Configuration
Create a `.env` file in the root of the `bff-service` directory with the following variables:
```env
PORT=3000
CART_SERVICE_URL=http://localhost:4000
PRODUCT_SERVICE_URL=http://localhost:5000
```

### Running the Application Locally
To start the application locally, run:
```sh
npm run dev
```
The service will be available at `http://localhost:3000`.

## Deployment

### AWS Configuration
1. Configure AWS credentials:
   ```sh
   aws configure
   ```
2. Bootstrap your AWS environment:
   ```sh
   cdk bootstrap
   ```

### Deploying the Application
To deploy the application to AWS, run:
```sh
npm run eb:deploy
```

### Destroying the Application
To terminate the deployed environment, run:
```sh
npm run eb:terminate
```

## API Documentation

### Available Endpoints
#### GET /products
- **Description**: Retrieves a list of all products.
- **Response**: JSON array of product objects.

#### GET /cart
- **Description**: Retrieves the current user's cart.
- **Response**: JSON object of the cart.

## Testing

### Running Unit Tests
To run unit tests, use:
```sh
npm test
```

### Running Integration Tests
To run integration tests, use:
```sh
npm run test:integration
```

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes and push them to your fork.
4. Submit a pull request.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.