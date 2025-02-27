# nodejs-aws-shop-backend

## Getting Started

This repository contains several subprojects. Follow the steps below to get started with each service.

### Prerequisites

Make sure you have the following installed:
- Node.js (version 14.x or later)
- npm (version 6.x or later)
- AWS CLI (configured with your credentials)

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/nodejs-aws-shop-backend.git
    cd nodejs-aws-shop-backend
    ```

### CDK Bootstrap

Before deploying CDK applications for the first time in an AWS environment (account/region), you need to bootstrap the environment:

```bash
cdk bootstrap
```

### Running the Services

#### `product_service`

1. Navigate to the `product_service` directory:
    ```bash
    cd backend/product_service
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

3. Deploy the Lambda function using AWS CDK:
    ```bash
    npm run cdk:deploy
    ```
