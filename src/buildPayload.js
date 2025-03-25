const logger = require('./logger');

function buildPayload(method, requestUrl, requestHeaders, requestBody, other) {
    try {
        logger.info('Encoding request data to base64 for Vault...');

        const iam_request_url = Buffer.from(requestUrl, 'utf-8').toString('base64');
        const headerJson = JSON.stringify(requestHeaders);
        const iam_request_headers = Buffer.from(headerJson, 'utf-8').toString('base64');
        const iam_request_body = Buffer.from(requestBody, 'utf-8').toString('base64');

        logger.info("The payload has been built.");

        return {
            iam_http_request_method: method,
            iam_request_url,
            iam_request_headers,
            iam_request_body,
            ...other
        };
    }
    catch (e) {
        logger.error("Some unexpected error occurred while building a payload.");
        throw e;
    }
}

module.exports = buildPayload;