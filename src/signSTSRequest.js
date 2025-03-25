const logger = require('./logger');
const aws4 = require('aws4');
const getAWSCredentials = require("./getAWSCredentials");

async function signStsRequest(caches, { accessKeyId, secretAccessKey, sessionToken, region, additionalHeaders = {} }) {
    try {
        if (!accessKeyId || !secretAccessKey || !sessionToken || !region) {
            const credentials = await getAWSCredentials(caches);
            accessKeyId = credentials.AWS_ACCESS_KEY_ID;
            secretAccessKey = credentials.AWS_SECRET_ACCESS_KEY;
            sessionToken = credentials.AWS_SESSION_TOKEN;
            region = credentials.AWS_REGION;
        }

        logger.info('Constructing SigV4-signed GetCallerIdentity request...');

        const host = `sts.${region}.amazonaws.com`;
        const body = 'Action=GetCallerIdentity&Version=2011-06-15';
        const opts = {
            host,
            path: '/',
            service: 'sts',
            region: region,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                'X-Amz-Security-Token': sessionToken
            },
            body,
        };

        opts.headers = {...opts.headers, ...additionalHeaders};

        // Sign with aws4
        logger.info("Signing the request.");
        aws4.sign(opts, {
            accessKeyId,
            secretAccessKey,
            sessionToken,
        });

        // Final URL & headers
        const finalUrl = `https://${host}${opts.path}`;
        const finalHeaders = opts.headers;
        const finalBody = opts.body;

        logger.info("The request has been signed");

        return { finalUrl, finalHeaders, finalBody };
    }
    catch (e) {
        logger.error("Some unexpected error occurred while signing the STS request.");
        throw e;
    }
}

module.exports = signStsRequest;