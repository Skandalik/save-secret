const core = require('@actions/core');
const github = require('@actions/github');
const sodium = require('tweetsodium');

// Base on actions/javascript-action template.
async function run() {
  try {
    // Get tokens from arguments of an action
    const githubToken = core.getInput('github_token', {required: true});
    const ownerWithRepo = core.getInput('repository', {required: true});
    const secretName = core.getInput('secret_name', {required: true});
    const secretValue = core.getInput('secret_value', {required: true});

    // TODO: dirty but currently it's not possible to fetch repository name from event when using scheduled action.
    const [owner, repository] = ownerWithRepo.split("/");

    core.info(`> owner: ${owner}`);
    core.info(`> repository: ${repository}`);
    core.info(`> secret_name: ${secretName}`);

    // Setup octokit
    const octokit = github.getOctokit(githubToken)

    const {key, keyId} = await repositoryData(octokit, owner, repository)
    const encrypted = encrypt(key, secretValue)
    await handleSecret(octokit, secretName, encrypted, owner, repository, keyId)
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function repositoryData(octokit, owner, repository) {
  core.info("Requesting repository public key")
  const time = Date.now();
  const {status, data} = await octokit.request('GET /repos/{owner}/{repo}/actions/secrets/public-key', {
    owner: owner,
    repo: repository,
  })

  core.info(`< ${status} ${Date.now() - time}ms`);
  return {
    key: data.key,
    keyId: data.key_id
  }
}

function encrypt(secret, value) {
  core.info("Encrypting passed value")
  // Convert the message and key to Uint8Array's (Buffer implements that interface)
  const messageBytes = Buffer.from(value);
  const keyBytes = Buffer.from(secret, 'base64');

  // Encrypt using LibSodium.
  const encryptedBytes = sodium.seal(messageBytes, keyBytes);

  // Base64 the encrypted secret
  return Buffer.from(encryptedBytes).toString('base64');
}

async function handleSecret(octokit, secretName, encrypted, owner, repository, keyId) {
  core.info("Creating repo secret")
  const time = Date.now();
  const {status, headers, data} = await octokit.actions.createOrUpdateRepoSecret({
    owner: owner,
    repo: repository,
    secret_name: secretName,
    encrypted_value: encrypted,
    key_id: keyId
  })
  core.info(`< ${status} ${Date.now() - time}ms`);

  core.setOutput("status", status);
  core.setOutput("headers", JSON.stringify(headers, null, 2));
  core.setOutput("data", JSON.stringify(data, null, 2));
}

run();
