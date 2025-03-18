import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import * as dotenv from 'dotenv';

dotenv.config();

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  console.log('Event: ', JSON.stringify(event));

  try {
    // Check if Authorization header exists
    if (!event.authorizationToken) {
      throw new Error('Unauthorized: No Authorization header');
    }

    // Extract credentials from Basic Auth header
    const token = event.authorizationToken.split(' ')[1];
    const credentials = Buffer.from(token, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Get stored credentials from environment variables
    const storedCredentials = process.env[username];

    if (!storedCredentials || storedCredentials !== password) {
      throw new Error('Forbidden: Invalid credentials');
    }

    // Generate policy if authentication is successful
    return generatePolicy('user', 'Allow', event.methodArn);

  } catch (error: unknown) {
    console.log('Error:', error);

    if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          throw new Error('Unauthorized'); // Will result in 401
        } else {
          throw new Error('Forbidden'); // Will result in 403
        }
      } else {
        throw new Error('Forbidden');
      }
  }
};

const generatePolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    }
  };
};
