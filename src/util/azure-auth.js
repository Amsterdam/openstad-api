const { WorkloadIdentityCredential } = require("@azure/identity");

let azureAuth

const makeAzureAuth = async () => {
    const scope = process.env.AZURE_MYSQL_SCOPE
    console.log("scope", scope)

    // This relies on environment variables that get injected.
    // AZURE_AUTHORITY_HOST:       (Injected by the webhook)
    // AZURE_CLIENT_ID:            (Injected by the webhook)
    // AZURE_TENANT_ID:            (Injected by the webhook)
    // AZURE_FEDERATED_TOKEN_FILE: (Injected by the webhook)

    const credential = new WorkloadIdentityCredential()
    console.log("credential:", credential)
    credential.getToken(scope).then((token) => console.log("token:", token))
    const token = await credential.getToken(scope)
    return {
        dbPassword: token.token
    }
}

module.exports = async () => {
    console.log("azure auth export function, azure auth:", azureAuth)
    if (!azureAuth) {
        console.log("aanroepen makeAzureAuth")
        azureAuth = await makeAzureAuth()
    }
    return azureAuth
}

// module.exports = getAzureAuth()