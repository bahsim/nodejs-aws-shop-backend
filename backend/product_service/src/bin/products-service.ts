import * as cdk from 'aws-cdk-lib';
import { ProductServiceStack } from '../lib/products-service-stack';

const app = new cdk.App();
new ProductServiceStack(app, 'product-service-stack');
