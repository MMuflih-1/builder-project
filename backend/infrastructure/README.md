# Pupper Infrastructure

This directory contains the AWS CDK infrastructure code for the Pupper application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Bootstrap CDK (first time only):
```bash
npx cdk bootstrap
```

3. Deploy the stack:
```bash
npm run deploy
```

## Architecture

### DynamoDB Tables

**DogsTable** (`pupper-dogs`)
- Primary Key: `dogId` (String)
- GSI: `StateIndex` - partition: `state`, sort: `createdAt`
- GSI: `SpeciesIndex` - partition: `species`, sort: `createdAt`
- Features: Encryption, Point-in-time recovery

**VotesTable** (`pupper-votes`)
- Primary Key: `userId` (String), Sort Key: `dogId` (String)
- GSI: `DogVotesIndex` - partition: `dogId`, sort: `timestamp`
- Features: Encryption, Point-in-time recovery

### S3 Bucket

**PupperImagesBucket**
- Stores original, resized (400x400), and thumbnail (50x50) images
- Encryption enabled
- Versioning enabled
- Lifecycle rules for cleanup

## Commands

- `npm run build` - Compile TypeScript
- `npm run deploy` - Deploy stack
- `npm run destroy` - Destroy stack
- `npm run watch` - Watch for changes