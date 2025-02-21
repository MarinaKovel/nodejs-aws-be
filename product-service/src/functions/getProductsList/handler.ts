import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Product } from '../../types/product';

const products: Product[] = [
  { id: '1', title: 'Product 1', description: 'Description 1', price: 100 },
  { id: '2', title: 'Product 2', description: 'Description 2', price: 200 }
];

export const getProductsList = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
