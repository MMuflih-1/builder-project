import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
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

    // DynamoDB Table for Adoption Applications
    const applicationsTable = new dynamodb.Table(this, 'ApplicationsTable', {
      tableName: 'pupper-applications',
      partitionKey: {
        name: 'applicationId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev environment
    });

    // SNS Topic for email notifications
    const notificationTopic = new sns.Topic(this, 'AdoptionNotificationsTopic', {
      topicName: 'adoption-notifications',
      displayName: 'Pupper Adoption Notifications'
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

    const postConfirmationFunction = new lambda.Function(this, 'PostConfirmationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'post-confirmation.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
    });

    const preSignupFunction = new lambda.Function(this, 'PreSignupFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'pre-signup.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
    });

    const deleteDogFunction = new lambda.Function(this, 'DeleteDogFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'delete-dog.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        DOGS_TABLE_NAME: dogsTable.tableName,
      },
    });

    const submitAdoptionFunction = new lambda.Function(this, 'SubmitAdoptionFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'submit-adoption.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        APPLICATIONS_TABLE_NAME: applicationsTable.tableName,
      },
    });

    const getApplicationsFunction = new lambda.Function(this, 'GetApplicationsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'get-applications.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        APPLICATIONS_TABLE_NAME: applicationsTable.tableName,
        DOGS_TABLE_NAME: dogsTable.tableName,
      },
    });

    const updateApplicationFunction = new lambda.Function(this, 'UpdateApplicationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'update-application.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        APPLICATIONS_TABLE_NAME: applicationsTable.tableName,
        DOGS_TABLE_NAME: dogsTable.tableName,
      },
    });

    const getAllApplicationsFunction = new lambda.Function(this, 'GetAllApplicationsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'get-all-applications.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        APPLICATIONS_TABLE_NAME: applicationsTable.tableName,
        DOGS_TABLE_NAME: dogsTable.tableName,
      },
    });

    const generateImageFunction = new lambda.Function(this, 'GenerateImageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'generate-image.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        IMAGES_BUCKET_NAME: imagesBucket.bucketName,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
    });

    const recommendDogFunction = new lambda.Function(this, 'RecommendDogFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'recommend-dog.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        DOGS_TABLE_NAME: dogsTable.tableName,
      },
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
    });

    const validateImageFunction = new lambda.Function(this, 'ValidateImageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'validate-image.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Grant permissions to Lambda functions
    dogsTable.grantReadWriteData(createDogFunction);
    dogsTable.grantReadData(getDogsFunction);
    dogsTable.grantReadWriteData(deleteDogFunction);
    votesTable.grantReadWriteData(voteDogFunction);
    votesTable.grantReadData(getUserVotesFunction);
    applicationsTable.grantReadWriteData(submitAdoptionFunction);
    applicationsTable.grantReadData(getApplicationsFunction);
    dogsTable.grantReadData(getApplicationsFunction);
    applicationsTable.grantReadWriteData(updateApplicationFunction);
    dogsTable.grantReadWriteData(updateApplicationFunction); // Changed from ReadData to ReadWriteData
    
    // Grant SES permissions to update-application function
    updateApplicationFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));
    applicationsTable.grantReadData(getAllApplicationsFunction);
    dogsTable.grantReadData(getAllApplicationsFunction);
    imagesBucket.grantReadWrite(createDogFunction);
    imagesBucket.grantReadWrite(uploadImageFunction);
    imagesBucket.grantReadWrite(processImageFunction);
    dogsTable.grantReadWriteData(processImageFunction);
    
    // Grant Rekognition permissions to process image function
    processImageFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['rekognition:DetectLabels'],
      resources: ['*'],
    }));
    imagesBucket.grantReadWrite(generateImageFunction);
    
    // Grant Bedrock permissions to generate image function
    generateImageFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-canvas-v1:0'],
    }));
    
    // Grant permissions to recommend dog function
    dogsTable.grantReadData(recommendDogFunction);
    recommendDogFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0'],
    }));
    
    // Grant Rekognition permissions to validate image function
    validateImageFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['rekognition:DetectLabels'],
      resources: ['*'],
    }));

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
    dogById.addMethod('DELETE', new apigateway.LambdaIntegration(deleteDogFunction));
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

    // Adoption applications endpoint
    const applications = api.root.addResource('applications');
    applications.addMethod('POST', new apigateway.LambdaIntegration(submitAdoptionFunction));
    applications.addMethod('GET', new apigateway.LambdaIntegration(getAllApplicationsFunction));
    
    // Update application status
    const applicationById = applications.addResource('{applicationId}');
    applicationById.addMethod('PUT', new apigateway.LambdaIntegration(updateApplicationFunction));
    
    // Get applications for shelter user
    const userApplications = userById.addResource('applications');
    userApplications.addMethod('GET', new apigateway.LambdaIntegration(getApplicationsFunction));
    
    // Generate image endpoint
    const generateImage = api.root.addResource('generate-image');
    generateImage.addMethod('POST', new apigateway.LambdaIntegration(generateImageFunction));
    
    // Recommend dog endpoint
    const recommendDog = api.root.addResource('recommend-dog');
    recommendDog.addMethod('POST', new apigateway.LambdaIntegration(recommendDogFunction));
    
    // Validate image endpoint
    const validateImage = api.root.addResource('validate-image');
    validateImage.addMethod('POST', new apigateway.LambdaIntegration(validateImageFunction));

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

    // Cognito User Pool (simplified to avoid circular dependency)
    const userPool = new cognito.UserPool(this, 'PupperUserPool', {
      userPoolName: 'pupper-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        user_role: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 20,
          mutable: false,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'PupperUserPoolClient', {
      userPool,
      userPoolClientName: 'pupper-web-client',
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
    });

    // Grant permissions for PostConfirmation function to add users to groups
    postConfirmationFunction.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: ['cognito-idp:AdminAddUserToGroup'],
      resources: [userPool.userPoolArn],
    }));

    // Output Cognito details
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      exportName: 'PupperUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      exportName: 'PupperUserPoolClientId',
    });
  }
}