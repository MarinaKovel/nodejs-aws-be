import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Reference existing S3 bucket
    const bucket = s3.Bucket.fromBucketName(this, 'ImportBucket', 'aws-be-import-service-bucket');

    const importProductsFileLambda = new NodejsFunction(this, 'ImportProductsFileFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'importProductsFile',
      entry: path.join(__dirname, '../src/functions/importProductsFile/handler.ts'),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        REGION: this.region,
      },
      bundling: {
        externalModules: [],
        minify: true,
        sourceMap: true,
      },
    });

    const importFileParserFunction = new NodejsFunction(this, 'ImportFileParserFunction', {
      functionName: 'importFileParser',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'importFileParser',
      entry: path.join(__dirname, '../src/functions/importFileParser/handler.ts'),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        REGION: this.region,
      },
      bundling: {
        externalModules: [],
        minify: true,
        sourceMap: true,
      },
    });

    // Grant S3 permissions to the Lambda function
    bucket.grantReadWrite(importProductsFileLambda);
    bucket.grantReadWrite(importFileParserFunction);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'ImportApi', {
      restApiName: 'Import Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Create the /import resource
    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFileLambda), {
      requestParameters: {
        'method.request.querystring.name': true,
      },
    });

    // Add S3 event notification for the 'uploaded' folder
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserFunction),
      { prefix: 'uploaded/' }
    );

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'The URL of the Import API',
    });
  }
}
