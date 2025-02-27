import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { Product } from '../../types/product';
import { Stock } from '../../types/stock';

const client = new DynamoDBClient();
const dynamodb = DynamoDBDocumentClient.from(client);
const productsTable = process.env.PRODUCTS_TABLE || 'products';
const stocksTable = process.env.STOCKS_TABLE || 'stocks';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
}

export const getProductsById = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event));

  try {
    const productId = event.pathParameters?.id;

    if (!productId) {
      console.log('Product ID is missing');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Product ID is required' }),
      };
    }

    console.log('Fetching product:', productId);
    const productResult = await dynamodb.send(new GetCommand({
      TableName: productsTable,
      Key: { id: productId }
    }));

    if (!productResult.Item) {
      console.log('Product not found:', productId);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Product not found' }),
      };
    }

    console.log('Product found:', productResult.Item);
    const { id, title, description, price } = productResult.Item as Product;

    console.log('Fetching stock:', productId);
    const stockResult = await dynamodb.send(new GetCommand({
      TableName: stocksTable,
      Key: { product_id: productId }
    }));

    console.log('Stock found:', stockResult.Item);
    const stock: Stock = stockResult.Item as Stock || { count: 0 };

    // Join product with stock
    const joinedProduct = {
      id,
      title,
      description,
      price,
      count: stock.count
    };
    console.log('Returning joined product:', joinedProduct);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(joinedProduct),
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error', error: errorMessage }),
    };
  }
};
