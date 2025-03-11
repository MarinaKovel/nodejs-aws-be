import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../../utils/powertools';

const client = new DynamoDBClient();
const dynamodb = DynamoDBDocumentClient.from(client);
const productsTable = process.env.PRODUCTS_TABLE || 'products';
const stocksTable = process.env.STOCKS_TABLE || 'stocks';

export const catalogBatchProcess = async (event: SQSEvent) => {
  try {
    logger.info('Processing SQS messages', { recordCount: event.Records.length });

    for (const record of event.Records) {
      const productData = JSON.parse(record.body);
      logger.info('Processing product:', { productData });

      // Create product in products table
      await dynamodb.send(new PutCommand({
        TableName: productsTable,
        Item: {
          id: productData.id,
          title: productData.title,
          description: productData.description,
          price: productData.price
        }
      }));

      // Create stock in stocks table
      await dynamodb.send(new PutCommand({
        TableName: stocksTable,
        Item: {
          product_id: productData.id,
          count: productData.count
        }
      }));

      logger.info('Successfully created product and stock:', { productId: productData.id });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Products processed successfully' })
    };
  } catch (error) {
    logger.error('Error processing products:', { error });
    throw error;
  }
};
