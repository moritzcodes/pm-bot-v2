// Script to test AWS S3 bucket connection
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file manually
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
    // Also set in process.env for compatibility
    process.env[key] = value;
  }
});

// Initialize S3 client with credentials from .env
const s3Client = new S3Client({
  region: (process.env.AWS_REGION || 'us-east-1').replace(/"/g, ''), // Remove any quotes
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').replace(/"/g, ''), // Remove any quotes
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').replace(/"/g, ''), // Remove any quotes
  },
});

const BUCKET_NAME = (process.env.AWS_S3_BUCKET_NAME || '').replace(/"/g, ''); // Remove any quotes

// Create a temporary test file
const TEST_FILE_PATH = path.join(__dirname, 'test-file.txt');
const TEST_FILE_CONTENT = 'This is a test file to verify S3 bucket connection. Created at: ' + new Date().toISOString();
const TEST_FILE_KEY = 'test-connection-' + Date.now() + '.txt';

async function testS3Connection() {
  console.log('Testing S3 connection to bucket:', BUCKET_NAME);
  console.log('AWS Region:', process.env.AWS_REGION);
  console.log('Using Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 5) + '...' : 'Not set');
  
  try {
    // Create test file
    fs.writeFileSync(TEST_FILE_PATH, TEST_FILE_CONTENT);
    console.log('Created test file:', TEST_FILE_PATH);
    
    // Upload test file to S3
    console.log('Uploading test file to S3 bucket...');
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: TEST_FILE_KEY,
      Body: fs.createReadStream(TEST_FILE_PATH),
      ContentType: 'text/plain',
    };
    
    const uploadCommand = new PutObjectCommand(uploadParams);
    await s3Client.send(uploadCommand);
    console.log('✅ Successfully uploaded test file to S3!');
    console.log('File accessible at:', `https://${BUCKET_NAME}.s3.amazonaws.com/${TEST_FILE_KEY}`);
    
    // Verify upload by trying to get the object
    console.log('Verifying upload by checking if file exists...');
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: TEST_FILE_KEY,
    });
    
    await s3Client.send(getCommand);
    console.log('✅ Successfully verified file exists in S3 bucket!');
    
    // Clean up
    fs.unlinkSync(TEST_FILE_PATH);
    console.log('Cleaned up local test file');
    
    console.log('\n🎉 S3 connection test completed successfully! Your bucket connection is working properly.');
  } catch (error) {
    console.error('❌ Error testing S3 connection:', error.message);
    if (error.name === 'CredentialsProviderError') {
      console.error('This appears to be an issue with your AWS credentials. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    } else if (error.name === 'NoSuchBucket') {
      console.error(`The bucket '${BUCKET_NAME}' does not exist or you don't have permission to access it.`);
    } else if (error.code === 'NetworkingError') {
      console.error('Network error occurred. Please check your internet connection.');
    }
    
    // Clean up if file was created
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
      console.log('Cleaned up local test file');
    }
  }
}

testS3Connection();