# aws-ahh-sdk
Nice ahh sdk for some aws tricks.
This is made for being used in AWS environment, in particular for EC2 instances. 
## 1. Installation
Install the npm module<br>
<code>npm install aws-ahh-sdk
</code>

## 2. Usage
### 2.1 Import the module
<code>const {
  getAWSCredentials,
  signSTSRequest,
  buildPayload,
  vaultAWSLogin,
  vaultCert,
  setTLS
} = require('aws-ahh-sdk');</code>
### 2.2 Configure TLS/mTLS for Vault
You don't have to do this. You have 4 options here
#### 2.2.1 Do nothing
Then TLS is still used between Vault and your instance, but the certificate/key is not passed to Vault, so <bold>NO</bold> mTLS.
#### 2.2.2 Pass only Cert+Key paths
#### 2.2.3 Pass only CA path, it will be used to trust your custom CA if your Vault has one (Your instance, trusts Vault)
Note that here you might just alter the OS settings so that it trusts your CA initially, then don't need to do anything here.
#### 2.2.4 Pass both CA and Cert+Key
#### Example
Use setTLS function. You may also pass the tls into some parameters, but it might be more convenient to set it once, and forget about it.
<code>setTLS({
  cert: 'path/to/client.crt',
  key:  'path/to/client.key',
  ca:   'path/to/ca.crt'
});
</code>
### 2.3 Get AWS credentials.
<code>// force=false, BUFFER=300000 (5 minutes) by default
const creds = await getAWSCredentials(false, 300000);

console.log(creds);
// {
//   AWS_ACCESS_KEY_ID: 'AKIA...',
//   AWS_SECRET_ACCESS_KEY: '...',
//   AWS_SESSION_TOKEN: '...',
//   Expiration: 1679912345678,
//   AWS_REGION: 'us-east-1',
//   IAM_ROLE: 'myEc2Role'
// }</code>
Both arguments are optional. 

### 2.4 
