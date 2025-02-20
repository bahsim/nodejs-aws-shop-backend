export const ALLOWED_ORIGINS = [
    'https://dsja4dcomgujy.cloudfront.net',
    'http://localhost:3000'
];

export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0], // Default to first origin
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
};