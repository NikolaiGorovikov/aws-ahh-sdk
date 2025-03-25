const INITIAL_BUFFER = 300 * 1000; // Initial buffer of 5 minutes
const logger = require('./logger');

async function getAwsCredentialsFromIMDS(caches, force = false, BUFFER = INITIAL_BUFFER) {
    try {
        if (!force && caches.credentials && (caches.credentials.Expiration - BUFFER > Date.now())) {
            logger.info("Using cached credentials.");
            return caches.credentials;
        }

        logger.info('Fetching AWS credentials from EC2 instance metadata (IMDSv2)...');

        // 1. Fetch IMDSv2 token
        const tokenResp = await fetch('http://169.254.169.254/latest/api/token', {
            method: 'PUT',
            headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
        });
        if (!tokenResp.ok) {
            logger.error("Can't get the token.");
            throw new Error(`Unable to get metadata token. Status: ${tokenResp.status}`);
        }
        const metadataToken = await tokenResp.text();
        logger.info("Fetched the AWS EC2 token.");

        // 2. Fetch IAM role name
        logger.info("Fetching the IAM role name...");
        const roleNameResp = await fetch('http://169.254.169.254/latest/meta-data/iam/security-credentials/', {
            headers: { 'X-aws-ec2-metadata-token': metadataToken },
        });
        if (!roleNameResp.ok) {
            logger.error("Can't get the IAM role.");
            throw new Error(`Unable to retrieve IAM role name. Status: ${roleNameResp.status}`);
        }
        const iamRoleName = await roleNameResp.text();
        logger.info(`Fetched the IAM role name successfully: ${iamRoleName}`);

        // 3. Fetch credentials JSON
        logger.info("Fetching the JSON credentials...");
        const credsResp = await fetch(`http://169.254.169.254/latest/meta-data/iam/security-credentials/${iamRoleName}`, {
            headers: { 'X-aws-ec2-metadata-token': metadataToken },
        });
        if (!credsResp.ok) {
            logger.error("Can't get the AWS credentials.");
            throw new Error(`Unable to retrieve AWS credentials JSON. Status: ${credsResp.status}`);
        }
        const credsJson = await credsResp.json();
        // credsJson typically contains AccessKeyId, SecretAccessKey, Token, and Expiration fields.

        const AWS_ACCESS_KEY_ID = credsJson.AccessKeyId;
        const AWS_SECRET_ACCESS_KEY = credsJson.SecretAccessKey;
        const AWS_SESSION_TOKEN = credsJson.Token;
        const Expiration = new Date(credsJson.Expiration).getTime(); // Convert expiration time to a timestamp

        if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_SESSION_TOKEN || !Expiration) {
            logger.error("Some AWS credentials fields are missing.");
            throw new Error('Missing one or more AWS credential fields.');
        }
        logger.info('AWS credentials retrieved successfully.');

        // 4. Fetch AWS region from instance identity document
        logger.info("Fetching AWS region from instance identity document...");
        const identityDocResp = await fetch('http://169.254.169.254/latest/dynamic/instance-identity/document', {
            headers: { 'X-aws-ec2-metadata-token': metadataToken },
        });
        if (!identityDocResp.ok) {
            logger.error("Failed to retrieve AWS region information.");
            throw new Error(`Unable to retrieve instance identity document. Status: ${identityDocResp.status}`);
        }
        const identityDoc = await identityDocResp.json();
        const AWS_REGION = identityDoc.region;
        if (!AWS_REGION) {
            logger.error("AWS region field is missing in the instance identity document.");
            throw new Error('Missing AWS region in instance identity document.');
        }
        logger.info(`Fetched AWS region successfully: ${AWS_REGION}`);

        // Create the credentials object including region and IAM role name.
        const obj = {
            AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY,
            AWS_SESSION_TOKEN,
            Expiration,
            AWS_REGION,
            IAM_ROLE: iamRoleName
        };

        caches.credentials = obj;
        logger.info("Cached the credentials in local variable.");
        return obj;
    }
    catch (e) {
        logger.error("Some unexpected error occurred while getting the credentials.");
        throw e;
    }
}

module.exports = getAwsCredentialsFromIMDS;