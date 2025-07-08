"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const client_s3_1 = require("@aws-sdk/client-s3");
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: 'us-east-1' });
const s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { prompt } = body;
        if (!prompt) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                },
                body: JSON.stringify({ error: 'Prompt is required' }),
            };
        }
        // Enhanced prompt for better Labrador Retriever images
        const enhancedPrompt = `A high-quality, professional photograph of a ${prompt}. The dog should be a Labrador Retriever, well-lit, clear focus, sitting or standing in a neutral background, suitable for a dog adoption website. Photorealistic style.`;
        // Call Amazon Bedrock Titan for image generation
        const modelId = 'amazon.titan-image-generator-v1';
        const input = {
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                taskType: 'TEXT_IMAGE',
                textToImageParams: {
                    text: enhancedPrompt,
                },
                imageGenerationConfig: {
                    numberOfImages: 1,
                    height: 512,
                    width: 512,
                    cfgScale: 8.0,
                    seed: Math.floor(Math.random() * 1000000),
                },
            }),
        };
        const command = new client_bedrock_runtime_1.InvokeModelCommand(input);
        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const imageBase64 = responseBody.images[0];
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        // Generate unique filename that will trigger image processing
        const timestamp = Date.now();
        const filename = `generated-dog-${timestamp}.jpg`;
        // Upload to S3 (save as JPG to trigger existing image processing)
        const bucketName = process.env.IMAGES_BUCKET_NAME;
        const uploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: imageBuffer,
            ContentType: 'image/jpeg',
        });
        await s3Client.send(uploadCommand);
        // Return the S3 URL
        const imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
            body: JSON.stringify({ imageUrl }),
        };
    }
    catch (error) {
        console.error('Error generating image:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
            body: JSON.stringify({ error: 'Failed to generate image' }),
        };
    }
};
exports.handler = handler;
