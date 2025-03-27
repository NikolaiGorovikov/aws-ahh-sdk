const Agent = require('undici').Agent;
const fs = require('fs');

const INITIAL_BUFFER = 300*1000;

const logger = require("./logger");
const signStsRequest = require("./signSTSRequest");
const buildPayload = require("./buildPayload");

async function vaultLogin(caches, obj, role) {
    let address, payload, tls, BUFFER;
    if (typeof obj === 'string') {
        // received the address only, so will find the tls settings and payload
        tls = caches.tls;
        if (!tls || !!tls.cert !== !!tls.key) {
            tls = false;
            logger.warn("The TLS settings are defined, but not provided properly. TLS settings will be ignored")
        }
        if (!role) {
            logger.error("The Role is undefined.");
            throw new Error("The role was not defined.");
        }
        address = obj;
        const additionalHeaders = {'X-Vault-AWS-IAM-Server-ID': address.split(":")[0]}
        const { finalUrl, finalHeaders, finalBody } = await signStsRequest(caches, {additionalHeaders});
        payload = await buildPayload('POST', finalUrl, finalHeaders, finalBody, {role});
    }
    else {
        address = obj.address;
        payload = obj.payload;
        role = obj.role || role;
        BUFFER = obj.buffer;
        if (!address || !payload || !role) {
            logger.error("Some arguments are not provided.");
            throw new Error("Some arguments were not provided.");
        }
        tls = caches.tls || obj.tls;
        if (!tls || !!tls.cert !== !!tls.key) {
            tls = false;
            logger.warn("The TLS settings are defined, but not provided properly. TLS settings will be ignored")
        }
    }

    if (caches.vault && caches.vault.token && (caches.vault.expires > Date.now() + BUFFER)) {
        logger.info("Token already exists and is active, no need to log in");
        return caches.vault.token;
    }

    let agent = undefined;
    if (tls) {
        logger.info("The TLS details are provided.")
        logger.info("Reading the certificate and the key.");

        try {
            agent = new Agent({connect: {
                    cert: fs.readFileSync(tls.cert),
                    key: fs.readFileSync(tls.key),
                    ca: tls.ca ? fs.readFileSync(tls.ca) : undefined,
                }});
        }
        catch (e) {
            if (tls.cert) logger.error(`Can't read the file at: ${tls.cert}`);
            if (tls.key) logger.error(`Can't read the file at: ${tls.key}`);
            if (tls.ca) logger.error(`Can't read the file at: ${tls.ca}`);
        }
    }
    else {
        logger.warn("You are communicating with Vault, without mTLS, beware that Vault can reject the connection.");
    }

    logger.info("Read the certificate and the key successfully");

    const fullAddress = `https://${address}/v1/auth/aws/login`;
    logger.info(`Sending login request to Vault at: ${fullAddress}`);

    let resp;
    try {
        resp = await fetch(fullAddress, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            dispatcher: agent || undefined
        });
    }
    catch (e) {
        logger.error("The request to vault caused an error, watch out for expired or absent certificates.")
        throw e;
    }

    if (!resp.ok) {
        logger.error(`Vault responded with status: ${resp.status}`);
        console.log(await resp.json());
        throw new Error(`Vault login request failed. Status: ${resp.status}`);
    }

    const data = await resp.json();
    token = data.auth.client_token;
    if (!token) {
        logger.error("The token seems to be empty.");
        throw new Error("The token seems to be empty.");
    }
    caches.vault.expires = (Date.now() + data.auth.lease_duration*1000) || -Infinity;
    caches.vault.token = token;
    logger.info('Logged in successfully, received token.');
    return token;
}

module.exports = vaultLogin;