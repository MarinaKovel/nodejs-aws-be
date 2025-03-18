import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export interface AuthorizationServiceProps {
  stage?: string;
}

export class AuthorizationService extends Construct {
  public readonly basicAuthorizer: lambda.Function;

  constructor(scope: Construct, id: string, props: AuthorizationServiceProps = {}) {
    super(scope, id);

    const { stage = 'dev' } = props;

    // Define Lambda authorizer
    this.basicAuthorizer = new NodejsFunction(this, 'BasicAuthorizer', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../src/functions/basicAuthorizer/handler.ts'),
      handler: 'handler',
      environment: {
        [process.env.MarinaKovel || 'default']: 'TEST_PASSWORD',
      },
      bundling: {
        externalModules: [],
        minify: true,
        sourceMap: true,
      },
    });
  }
}
