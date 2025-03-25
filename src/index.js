// index.js

// Import your modules
const getAWSCredentials = require('./getAWSCredentials');
const buildPayload = require('./buildPayload');
const signSTSRequest = require('./signSTSRequest');
const vaultAWSLogin = require('./vaultAWSLogin');
const vaultCert = require('./vaultCert');
const setTLS = require('./setTLS'); // from setTLS.js

// Shared cache object
const cache = {
    vault: {
        certs: new Map(),
    },
    tls: null,
    credentials: null,
};

/**
 * @typedef {object} AwsCredentials
 * @property {string} AWS_ACCESS_KEY_ID
 * @property {string} AWS_SECRET_ACCESS_KEY
 * @property {string} AWS_SESSION_TOKEN
 * @property {number} Expiration - Unix timestamp (milliseconds)
 * @property {string} AWS_REGION
 * @property {string} IAM_ROLE
 */

/**
 * @typedef {object} SignedRequest
 * @property {string} finalUrl - The fully qualified URL for the STS request.
 * @property {Record<string, string>} finalHeaders - A dictionary of headers.
 * @property {string} finalBody - The body of the request.
 */

/**
 * Retrieves AWS credentials from the EC2 instance metadata (IMDSv2).
 *
 * @function
 * @name getAWSCredentials
 * @param {boolean} [force=false] - Force refresh even if current credentials are still valid.
 * @param {number} [BUFFER=300000] - A buffer (ms) before expiration to refresh credentials. Defaults to 5 min.
 * @returns {Promise<AwsCredentials>} Resolves with an object containing AWS credentials and metadata.
 */
function getAwsCredentials(force = false, BUFFER) {
    return getAWSCredentials(cache, force, BUFFER);
}

/**
 * Constructs a Vault-compatible payload by base64-encoding key fields.
 *
 * @function
 * @name buildPayload
 * @param {string} method - The HTTP method (e.g., 'POST', 'GET').
 * @param {string} requestUrl - The target URL for the request.
 * @param {object} requestHeaders - An object of headers.
 * @param {string} requestBody - The request body as a string.
 * @param {object} other - Additional fields to include in the payload.
 * @returns {object} A payload object suitable for Vault's AWS auth endpoint.
 */
function buildVaultPayload(method, requestUrl, requestHeaders, requestBody, other) {
    return buildPayload(method, requestUrl, requestHeaders, requestBody, other);
}

/**
 * Signs a GetCallerIdentity STS request using SigV4, returning the final URL/headers/body.
 *
 * @function
 * @name signSTSRequest
 * @param {object} options
 * @param {string} [options.accessKeyId] - AWS Access Key ID.
 * @param {string} [options.secretAccessKey] - AWS Secret Key.
 * @param {string} [options.sessionToken] - AWS Session Token.
 * @param {string} [options.region] - AWS Region (e.g. "us-east-1").
 * @param {object} [options.additionalHeaders={}] - Additional headers to merge into the request.
 * @returns {Promise<SignedRequest>} An object containing the signed finalUrl, finalHeaders, and finalBody.
 */
function signSts(options) {
    return signSTSRequest(cache, options);
}

/**
 * Logs in to Vault using the AWS auth method (IAM). This will sign
 * a request to STS, build the payload, and send it to Vault at `/v1/auth/aws/login`.
 *
 * @function
 * @name vaultAWSLogin
 * @param {string|object} obj - If a string, it's treated as the Vault address (host:port).
 *                              If an object, it can include { address, payload, role, buffer, tls }.
 * @param {string} [role] - Role to use if `obj` is a string. Otherwise, use `obj.role`.
 * @returns {Promise<string>} The Vault token if the login is successful.
 */
function vaultLogin(obj, role) {
    return vaultAWSLogin(cache, obj, role);
}

/**
 * Requests or retrieves a new certificate from Vault's PKI engine.
 *
 * @function
 * @name vaultCert
 * @param {object} params
 * @param {object} params.requestBody - The body to send in the certificate request.
 * @param {string} params.address - Vault address (host:port).
 * @param {string} params.pki_path - The path to the PKI engine (`pki/issue/...`).
 * @param {string} params.pki_role - The name of the PKI role (the last portion of the Vault path).
 * @param {string} params.vault_role - IAM role name for Vault AWS auth (only used if token is not provided).
 * @param {object} [params.tls] - Optional TLS settings override. { cert, key, ca } file paths.
 * @param {string} [params.version="v1"] - API version for Vault. Typically 'v1'.
 * @param {string|false} [token=false] - Existing Vault token. If not provided, one is fetched.
 * @returns {Promise<object>} The JSON data from Vault containing certificates/keys.
 */
function vaultCertRequest(params, token = false) {
    return vaultCert(cache, params, token);
}

/**
 * Sets up or overrides the TLS configuration in the cache.
 * This is used to enable TLS mutual auth (mTLS) for Vault.
 *
 * @function
 * @name setTLS
 * @param {object} options
 * @param {string} options.cert - File path to the client certificate.
 * @param {string} options.key - File path to the client key.
 * @param {string} options.ca - File path to the CA certificate.
 * @returns {boolean} True if successful.
 */
function configureTLS(options) {
    return setTLS(cache, options);
}

// Export all the functions in an object
module.exports = {
    getAWSCredentials: getAwsCredentials,
    buildPayload: buildVaultPayload,
    signSTSRequest: signSts,
    vaultAWSLogin: vaultLogin,
    vaultCert: vaultCertRequest,
    setTLS: configureTLS,
};