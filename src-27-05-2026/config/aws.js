const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

let s3Client = null;

// Configure AWS SDK
const configureAWS = () => {
  try {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    logger.info('AWS SDK configured successfully');
  } catch (error) {
    logger.error('AWS SDK configuration failed:', error);
  }
};

// S3 Client getter
const getS3Client = () => {
  if (!s3Client) {
    configureAWS();
  }
  return s3Client;
};

// Upload file to S3
const uploadToS3 = async (file, key, folder = 'uploads') => {
  const s3 = getS3Client();

  try {
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `${folder}/${key}`,
        Body: file.buffer || file,
        ContentType: file.mimetype,
        ACL: 'private',
      },
    });

    const result = await upload.done();
    logger.info(`File uploaded to S3: ${result.Key}`);
    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
    };
  } catch (error) {
    logger.error('S3 upload error:', error);
    throw error;
  }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
  const s3 = getS3Client();

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  };

  try {
    await s3.send(new DeleteObjectCommand(params));
    logger.info(`File deleted from S3: ${key}`);
  } catch (error) {
    logger.error('S3 delete error:', error);
    throw error;
  }
};

// Get signed URL for private files
const getSignedUrlFromS3 = async (key, expiresIn = 3600) => {
  const s3 = getS3Client();

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
};

module.exports = {
  configureAWS,
  getS3Client,
  uploadToS3,
  deleteFromS3,
  getSignedUrl: getSignedUrlFromS3,
};
