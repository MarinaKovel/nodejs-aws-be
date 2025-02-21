import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Construct } from 'constructs';  // Add this import

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda function using NodejsFunction
    const getProductsFunction = new NodejsFunction(this, 'GetProductsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductsList',
      entry: path.join(__dirname, '../src/functions/getProductsList/handler.ts'),
      bundling: {
        externalModules: ['aws-sdk'],
        minify: true,
        sourceMap: true,
      },
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Products Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Create API Gateway integration
    const productsIntegration = new apigateway.LambdaIntegration(getProductsFunction);
    api.root.addResource('products').addMethod('GET', productsIntegration);
  }
}
