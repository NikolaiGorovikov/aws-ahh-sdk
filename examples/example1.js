// Say you are running on some EC2 instance and you have your vault somewhere
// You need to get a new certificate, and you want it to use AWS credentials to login to vault

const aws = require("aws-ahh-sdk");

async function main() {
    // Here we set the certificates for mTLS, ca is optional if you have a system wide set list of trusted CAs.
    aws.setTLS({
        cert: "/opt/cert_rotator/certs/bundle.pem",
        key: "/opt/cert_rotator/certs/bundle.pem",
        ca: "/opt/cert_rotator/certs/ca.crt"
    });

    const certs = await aws.vaultCert({
        requestBody: {
            common_name: "active.vault.prod.vpc.campusmarket.com",
            alt_names: "*.vault.prod.vpc.campusmarket.com",
            ttl: "24h",
            format: "pem_bundle"
        },
        pki_path: "intermediate_pki",
        address: "active.vault.prod.vpc.campusmarket.com:8200",
        pki_role: "vault-nginx",
        vault_role: "vault-nginx-1"
    });

    // that's it, you got a brand new certificate and a key, do whatever you want
}

