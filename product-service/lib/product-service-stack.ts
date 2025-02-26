import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Reference existing DynamoDB tables
    const productsTable = dynamodb.Table.fromTableName(
      this,
      'ExistingProductsTable',
      'products'
    );

    const stocksTable = dynamodb.Table.fromTableName(
      this,
      'ExistingStocksTable',
      'stocks'
    );

    // Define the Lambda function using NodejsFunction
    const getProductsFunction = new NodejsFunction(this, 'GetProductsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductsList',
      entry: path.join(__dirname, '../src/functions/getProductsList/handler.ts'),
      bundling: {
        externalModules: [],
        minify: true,
        sourceMap: true,
      },
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    // Add the getProductById function
    const getProductByIdFunction = new NodejsFunction(this, 'GetProductByIdFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductsById',
      entry: path.join(__dirname, '../src/functions/getProductsById/handler.ts'),
      bundling: {
        externalModules: [],
        minify: true,
        sourceMap: true,
      },
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    // Grant permissions to Lambda functions
    productsTable.grantReadData(getProductsFunction);
    stocksTable.grantReadData(getProductsFunction);
    productsTable.grantReadData(getProductByIdFunction);
    stocksTable.grantReadData(getProductByIdFunction);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Products Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Create products resource and GET method for getting all products
    const products = api.root.addResource('products');
    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsFunction));

    // Add the /{id} resource and GET method for getting product by id
    const product = products.addResource('{id}');
    product.addMethod('GET', new apigateway.LambdaIntegration(getProductByIdFunction));
  }
}
