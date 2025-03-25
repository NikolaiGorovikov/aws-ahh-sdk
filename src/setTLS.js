const logger = require("./logger");

function setTLS(caches, {cert, key, ca}) {
    if (!cert || !key || !ca) {
        logger.error("Not all arguments were provided to set up TLS")
        throw new Error("Not all arguments for TLS setup provided.");
    }
    try {
        caches.tls = {
            ca, key, cert
        };
        return true;
    }
    catch (e) {
        logger.error("Some unexpected error occurred.");
        throw e;
    }
}

module.exports = setTLS;