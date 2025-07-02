import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class PupperStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for Dogs
    const dogsTable = new dynamodb.Table(this, 'DogsTable', {
      tableName: 'pupper-dogs',
      partitionKey: {
        name: 'dogId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev environment
    });

    // Global Secondary Index for filtering by state
    dogsTable.addGlobalSecondaryIndex({
      indexName: 'StateIndex',
      partitionKey: {
        name: 'state',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Global Secondary Index for filtering by species (Labrador validation)
    dogsTable.addGlobalSecondaryIndex({
      indexName: 'SpeciesIndex',
      partitionKey: {
        name: 'species',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // DynamoDB Table for User Votes (wag/growl)
    const votesTable = new dynamodb.Table(this, 'VotesTable', {
      tableName: 'pupper-votes',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'dogId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev environment
    });

    // Global Secondary Index for getting all votes by dog
    votesTable.addGlobalSecondaryIndex({
      indexName: 'DogVotesIndex',
      partitionKey: {
        name: 'dogId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // S3 Bucket for storing dog images
    const imagesBucket = new s3.Bucket(this, 'PupperImagesBucket', {
      bucketName: `pupper-images-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['http://localhost:5173', 'http://localhost:3000'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev environment
    });

    // Lambda Functions
    const createDogFunction = new lambda.Function(this, 'CreateDogFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'create-dog.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        DOGS_TABLE_NAME: dogsTable.tableName,
        ENCRYPTION_KEY: 'pupper-encryption-key-change-in-production',
      },
    });

    const getDogsFunction = new lambda.Function(this, 'GetDogsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'get-dogs.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        DOGS_TABLE_NAME: dogsTable.tableName,
      },
    });

    const voteDogFunction = new lambda.Function(this, 'VoteDogFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'vote-dog.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        VOTES_TABLE_NAME: votesTable.tableName,
      },
    });

    const uploadImageFunction = new lambda.Function(this, 'UploadImageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'upload-image.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        IMAGES_BUCKET_NAME: imagesBucket.bucketName,
      },
    });

    const processImageFunction = new lambda.Function(this, 'ProcessImageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'process-image-simple.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        DOGS_TABLE_NAME: dogsTable.tableName,
      },
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
    });

    const getUserVotesFunction = new lambda.Function(this, 'GetUserVotesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'get-user-votes.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        VOTES_TABLE_NAME: votesTable.tableName,
      },
    });

    // Grant permissions to Lambda functions
    dogsTable.grantReadWriteData(createDogFunction);
    dogsTable.grantReadData(getDogsFunction);
    votesTable.grantReadWriteData(voteDogFunction);
    votesTable.grantReadData(getUserVotesFunction);
    imagesBucket.grantReadWrite(createDogFunction);
    imagesBucket.grantReadWrite(uploadImageFunction);
    imagesBucket.grantReadWrite(processImageFunction);
    dogsTable.grantReadWriteData(processImageFunction);

    // S3 trigger for image processing
    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processImageFunction),
      { suffix: '.jpg' }
    );
    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processImageFunction),
      { suffix: '.jpeg' }
    );
    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processImageFunction),
      { suffix: '.png' }
    );

    // API Gateway
    const api = new apigateway.RestApi(this, 'PupperApi', {
      restApiName: 'Pupper Service',
      description: 'API for Pupper dog adoption app',
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:5173', 'http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      },
    });

    // API Routes (Public for testing)
    const dogs = api.root.addResource('dogs');
    dogs.addMethod('POST', new apigateway.LambdaIntegration(createDogFunction));
    dogs.addMethod('GET', new apigateway.LambdaIntegration(getDogsFunction));

    const dogById = dogs.addResource('{dogId}');
    const vote = dogById.addResource('vote');
    vote.addMethod('POST', new apigateway.LambdaIntegration(voteDogFunction));

    // Image upload endpoint
    const upload = api.root.addResource('upload');
    upload.addMethod('POST', new apigateway.LambdaIntegration(uploadImageFunction));

    // User votes endpoint
    const users = api.root.addResource('users');
    const userById = users.addResource('{userId}');
    const userVotes = userById.addResource('votes');
    userVotes.addMethod('GET', new apigateway.LambdaIntegration(getUserVotesFunction));

    // Output the table names and bucket name for use in Lambda functions
    new cdk.CfnOutput(this, 'DogsTableName', {
      value: dogsTable.tableName,
      exportName: 'PupperDogsTableName',
    });

    new cdk.CfnOutput(this, 'VotesTableName', {
      value: votesTable.tableName,
      exportName: 'PupperVotesTableName',
    });

    new cdk.CfnOutput(this, 'ImagesBucketName', {
      value: imagesBucket.bucketName,
      exportName: 'PupperImagesBucketName',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      exportName: 'PupperApiUrl',
    });
  }
}