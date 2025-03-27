const Agent = require('undici').Agent;
const fs = require('fs');

const logger = require("./logger");
const vaultAWSLogin = require("./vaultAWSLogin");

async function getCert(caches, {requestBody, address, pki_path, pki_role, vault_role, tls, version = "v1"}, token = false) {
    if (!token) {
        logger.info("Token was not provided, will acquire it now.");
        token = await vaultAWSLogin(caches, address, vault_role);
    }

    tls = tls || caches.tls;
    if (!tls || !!tls.cert !== !!tls.key) {
        tls = false;
        logger.warn("The TLS settings are defined, but not provided properly. TLS settings will be ignored")
    }

    logger.info("Reading the certificate and the key.");
    let agent;
    if (tls) {
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


    const url = `https://${address}/${version}/${pki_path}/issue/${pki_role}`;

    logger.info(`Getting a new certificate from: ${url}`);

    let resp;
    try {
        resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Vault-Token': token
            },
            body: JSON.stringify(requestBody),
            dispatcher: agent || undefined
        });
    }
    catch (e) {
        logger.error("The error while making a request to vault occurred");
        throw new Error("Error while making a request to vault occurred, likely due to wrong certificates.");
    }

    if (!resp.ok) {
        const err = JSON.stringify(await resp.json());
        logger.error(`Vault responded with error status:  ${resp.status}, error: ${err}`);
        throw new Error(`Vault login request failed. Status: ${resp.status}, error: ${err}`);
    }

    logger.info("Received certificate and the key.");

    const json = await resp.json();

    const expiration = json.data.expiration*1000;

    const data = json.data;

    logger.info("The certificate expires at: " + new Date(expiration).toString());

    return data;
}

module.exports = getCert;