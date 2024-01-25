import { WorkloadIdentityCredential } from "@azure/identity";

let azureAuth

const makeAzureAuth = async () => {
    const scope = process.env.AZURE_MYSQL_SCOPE

    // This relies on environment variables that get injected.
    // AZURE_AUTHORITY_HOST:       (Injected by the webhook)
    // AZURE_CLIENT_ID:            (Injected by the webhook)
    // AZURE_TENANT_ID:            (Injected by the webhook)
    // AZURE_FEDERATED_TOKEN_FILE: (Injected by the webhook)

    const credential = new WorkloadIdentityCredential()

    return {
        dbPassword: async () => await credential.getToken(scope).token
    }
}

const getAzureAuth = async () => {
    if (!azureAuth) {
        azureAuth = await makeAzureAuth()
    }
    return azureAuth
}

export default getAzureAuth