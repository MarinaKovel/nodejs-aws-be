import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  TransactWriteCommandInput
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { ProductRequest } from '../../types/product';

const client = new DynamoDBClient();
const dynamodb = DynamoDBDocumentClient.from(client);
const productsTable = process.env.PRODUCTS_TABLE || 'products';
const stocksTable = process.env.STOCKS_TABLE || 'stocks';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

export const createProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event received:', JSON.stringify(event));

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Request body is missing' }),
      };
    }

    let productData: ProductRequest;
    try {
      productData = JSON.parse(event.body);
      console.log('Parsed product data:', productData);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid JSON in request body' }),
      };
    }

    if (!productData.title || !productData.description || productData.price === undefined || productData.count === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Missing required fields. Please provide title, description, price, and count.'
        }),
      };
    }

    if (typeof productData.title !== 'string' ||
      typeof productData.description !== 'string' ||
      typeof productData.price !== 'number' ||
      typeof productData.count !== 'number') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Invalid data types. Title and description must be strings, price and count must be numbers.'
        }),
      };
    }

    const productId = uuidv4();
    console.log('Generated product ID:', productId);
    const { title, description, price, count } = productData;

    const product = {
      id: productId,
      title,
      description,
      price
    };

    const stock = {
      product_id: productId,
      count
    };

    // If one of the operations fails (add item in products+stocks) the transaction will be canceled
    const transactParams: TransactWriteCommandInput = {
      TransactItems: [
        {
          Put: {
            TableName: productsTable,
            Item: product
          }
        },
        {
          Put: {
            TableName: stocksTable,
            Item: stock
          }
        }
      ]
    };

    console.log('Executing transaction:', JSON.stringify(transactParams));
    await dynamodb.send(new TransactWriteCommand(transactParams));
    console.log('Transaction completed successfully');

    const createdProduct = {
      ...product,
      count: stock.count
    };

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(createdProduct),
    };
  } catch (error: unknown) {
    console.error('Error creating product:', error);

    if (error instanceof Error) {
      if (error.name === 'TransactionCanceledException') {
        console.error('Transaction was cancelled. One or more conditions were not met.');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'Transaction failed. The product or stock may already exist.',
            error: error.message
          }),
        };
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error details:', errorMessage);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error', error: errorMessage }),
    };
  }
};
