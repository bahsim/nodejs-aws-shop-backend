import { Configuration } from "./config";

export const ALLOWED_ORIGINS = [
  Configuration.getConfig()?.frontendUrl || "http://localhost:3000",
  "http://localhost:3000",
];

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0], // Default to first origin
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
};

// Define user name
export const GITHUB_USER_NAME = 'bahsim';

// Define Lambda names and handlers
export const LAMBDA_FUNCTIONS = {
  productService: {
    getProductsList: {
      name: "GetProductsList",
      handler: "getProductsList",
    },
    getProductsById: {
      name: "GetProductsById",
      handler: "getProductsById",
    },
    createProduct: {
      name: "CreateProduct",
      handler: "createProduct",
    },
    seedTables: {
      name: "SeedTables",
      handler: "SeedTables",
    },
    catalogBatchProcess: {
      name: "CatalogBatchProcess",
      handler: "catalogBatchProcess",
    },
  },
  importService: {
    importProductsFile: {
      name: "ImportProductsFile",
      handler: "importProductsFile",
    },
    importFileParser: {
      name: "ImportFileParser",
      handler: "importFileParser",
    },
  },
  authorizationService: {
    basicAuthorizer: {
      name: "BasicAuthorizer",
      handler: "basicAuthorizer",
    },
  },
};
