import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Product } from '../../types/product';
import { Stock } from '../../types/stock';

const client = new DynamoDBClient();
const dynamodb = DynamoDBDocumentClient.from(client);
const productsTable = process.env.PRODUCTS_TABLE || 'products';
const stocksTable = process.env.STOCKS_TABLE || 'stocks';
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const getProductsList = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event));

  try {
    console.log('Fetching all products');
    const productsResult = await dynamodb.send(new ScanCommand({
      TableName: productsTable,
    }));

    const products: Product[] = productsResult.Items as Product[] || [];
    console.log('Products fetched', products.length);

    console.log('Fetching all stocks');
    const stocksResult = await dynamodb.send(new ScanCommand({
      TableName: stocksTable,
    }));

    const stocks: Stock[] = stocksResult.Items as Stock[] || [];
    console.log('Products fetched', stocks.length);

    console.log('Joining products with stocks');
    const joinedProducts = products.map(product => {
      const stock = stocks.find(s => s.product_id === product.id) || { count: 0 };
      const { id, title, description, price } = product;
      return {
        id,
        title,
        description,
        price,
        count: stock.count
      };
    });

    console.log('Returning joined products', joinedProducts.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(joinedProducts),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
