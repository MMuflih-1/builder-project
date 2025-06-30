import { S3Event, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import sharp from 'sharp';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const DOGS_TABLE = process.env.DOGS_TABLE_NAME!;

export const handler: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      
      // Skip if already processed (avoid infinite loops)
      if (key.includes('resized-') || key.includes('thumbnail-')) {
        continue;
      }

      console.log(`Processing image: ${key}`);

      // Get the original image
      const getObjectResponse = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }));

      if (!getObjectResponse.Body) {
        throw new Error('No image data found');
      }

      const imageBuffer = Buffer.from(await getObjectResponse.Body.transformToByteArray());

      // Create 400x400 resized image
      const resizedBuffer = await sharp(imageBuffer)
        .resize(400, 400, { fit: 'cover' })
        .png()
        .toBuffer();

      // Create 50x50 thumbnail
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(50, 50, { fit: 'cover' })
        .png()
        .toBuffer();

      // Upload resized images
      const resizedKey = `resized-${key.replace(/\.[^/.]+$/, '.png')}`;
      const thumbnailKey = `thumbnail-${key.replace(/\.[^/.]+$/, '.png')}`;

      await Promise.all([
        s3Client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: resizedKey,
          Body: resizedBuffer,
          ContentType: 'image/png',
        })),
        s3Client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/png',
        })),
      ]);

      // Extract dogId from filename (assuming format: dogId-original.jpg)
      const dogId = key.split('-')[0];

      // Update DynamoDB with image URLs
      const baseUrl = `https://${bucket}.s3.amazonaws.com`;
      await docClient.send(new UpdateCommand({
        TableName: DOGS_TABLE,
        Key: { dogId },
        UpdateExpression: 'SET originalImageUrl = :original, resizedImageUrl = :resized, thumbnailUrl = :thumbnail',
        ExpressionAttributeValues: {
          ':original': `${baseUrl}/${key}`,
          ':resized': `${baseUrl}/${resizedKey}`,
          ':thumbnail': `${baseUrl}/${thumbnailKey}`,
        },
      }));

      console.log(`Successfully processed image for dog: ${dogId}`);

    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }
};