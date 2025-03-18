import * as cdk from 'aws-cdk-lib';
import { AuthorizationService } from '../lib';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'AuthorizationServiceStack', {
  env: { 
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

new AuthorizationService(stack, 'AuthService', {
  stage: 'dev'
});

app.synth();
