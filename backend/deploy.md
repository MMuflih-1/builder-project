# Deployment Steps

## 1. Build Lambda Functions
```bash
cd backend/lambda
npm install
npm run build
```

## 2. Deploy Infrastructure
```bash
cd ../infrastructure
npm run deploy
```

## 3. API Endpoints Created
- `POST /dogs` - Create a new dog
- `GET /dogs` - Get all dogs (with filters)
- `POST /dogs/{dogId}/vote` - Vote on a dog

## 4. Query Parameters for GET /dogs
- `state` - Filter by state
- `minWeight` - Minimum weight
- `maxWeight` - Maximum weight  
- `color` - Filter by color
- `minAge` - Minimum age in years
- `maxAge` - Maximum age in years

## 5. Test the API
Use the API URL from the deployment output to test endpoints.