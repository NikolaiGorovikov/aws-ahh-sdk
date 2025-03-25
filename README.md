# 🛠️ aws-ahh-sdk

**Nice ahh SDK for some AWS tricks.**

> Designed for AWS environments, especially EC2 instances.

---

## 📦 Installation

Install via npm:

```bash
npm install aws-ahh-sdk
```

---

## 🚀 Usage

### 2.1 Import the module

```js
const {
  getAWSCredentials,
  signSTSRequest,
  buildPayload,
  vaultAWSLogin,
  vaultCert,
  setTLS
} = require('aws-ahh-sdk');
```

---

### 2.2 Configure TLS/mTLS for Vault

You have **four options** here. This step is optional.

#### 🔹 2.2.1 Do Nothing

TLS is still used between Vault and your instance, but the certificate/key is not passed to Vault — so **no mTLS**.

#### 🔹 2.2.2 Pass Only Cert + Key Paths

Your instance presents a client certificate and key.

#### 🔹 2.2.3 Pass Only CA Path

Used to trust your **custom CA** (your instance trusts Vault).  
You might instead configure your OS to trust the CA, and skip this step.

#### 🔹 2.2.4 Pass Both CA and Cert + Key

Most secure option: mutual TLS.

#### ✅ Example: Using `setTLS`

```js
setTLS({
  cert: 'path/to/client.crt',
  key:  'path/to/client.key',
  ca:   'path/to/ca.crt'
});
```

You can also pass `tls` directly into function parameters, but using `setTLS` once is often more convenient.

---

### 2.3 Get AWS Credentials

```js
// force = false, BUFFER = 300000 (5 minutes) by default
const creds = await getAWSCredentials(false, 300000);

console.log(creds);
// {
//   AWS_ACCESS_KEY_ID: 'AKIA...',
//   AWS_SECRET_ACCESS_KEY: '...',
//   AWS_SESSION_TOKEN: '...',
//   Expiration: 1679912345678,
//   AWS_REGION: 'us-east-1',
//   IAM_ROLE: 'myEc2Role'
// }
```

> Both arguments are optional.

---

### 2.4 Sign STS Request

The simplest thing ever: sign a request to STS with AWS credentials.

```js
const signedReq = await signSTSRequest({
  // If omitted, getAWSCredentials() will be called internally
  accessKeyId: creds.AWS_ACCESS_KEY_ID,
  secretAccessKey: creds.AWS_SECRET_ACCESS_KEY,
  sessionToken: creds.AWS_SESSION_TOKEN,
  region: creds.AWS_REGION,
  additionalHeaders: {
    'Custom-Header': 'ABC123'
  }
});

console.log(signedReq);
// {
//   finalUrl: 'https://sts.us-east-1.amazonaws.com/',
//   finalHeaders: {
//     'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
//     'X-Amz-Security-Token': '...',
//     'Custom-Header': 'ABC123',
//     'Authorization': 'AWS4-HMAC-SHA256 Credential=...',
//     ...
//   },
//   finalBody: 'Action=GetCallerIdentity&Version=2011-06-15'
// }
```
> Note, that accessKeyId, secretAccessKey, sessionToken, and region are optional
> In this case it will just be obtained from the getAWSCredentials function automatically, but, still when you use vault, you might need to pass additional headers, so take care about them
---

### 2.5 Log in to Vault Using AWS Auth

```js
// Option A: Pass a string for the Vault address + a role
const vaultToken = await vaultAWSLogin('vault.mydomain.com:8200', 'myVaultRole');
console.log(vaultToken); // 'hvs.XYZ123...'

// Option B: Pass an object with more detailed control
const vaultToken2 = await vaultAWSLogin({
  address: 'vault.mydomain.com:8200',
  payload: { /* override your custom payload if needed */ },
  role: 'myVaultRole',
  buffer: 300000 // 5-minute buffer before re-login
});
```

> The library caches the token until it’s near expiration.  
> Future calls with the same parameters (within the valid time window) return the cached token.

---

### 2.6 Get a New Certificate from Vault’s PKI

```js
// Request a certificate from Vault’s PKI engine
const certData = await vaultCert({
  requestBody: {
    common_name: 'my.service.internal',
    alt_names: 'alt1.service.internal,alt2.service.internal',
    ttl: '24h'
  },
  address: 'vault.mydomain.com:8200',
  pki_path: 'pki_int',
  pki_role: 'myPkiRole',   // PKI role name (Vault path suffix)
  vault_role: 'myVaultRole', // AWS auth role
  // optional override of TLS cert/key/ca if not already set
  tls: {
    cert: 'path/to/client.crt',
    key: 'path/to/client.key',
    ca: 'path/to/ca.crt'
  },
  version: 'v1'
});

console.log(certData);
// {
//   certificate: '-----BEGIN CERTIFICATE-----...',
//   issuing_ca: '-----BEGIN CERTIFICATE-----...',
//   private_key: '-----BEGIN PRIVATE KEY-----...',
//   serial_number: '...',
//   ...
// }
```

> If you already have a valid Vault token, you can pass it as the second argument to `vaultCert()` to avoid re-authenticating.  
> **Note:** this token is **not cached**, unlike the AWS token.

---

Ahhh...