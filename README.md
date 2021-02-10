# save-secret

---
GitHub Action that takes secret value and saves it in the repository secrets.
It was created for ability to be used with private ECR images. 

## Usage

```yaml
uses: Skandalik/save-secret@v1.0.0
with:
  # Your own repository or organisation-wide GitHub token that has administrator write permissions 
  github_token: ${{ secrets.GITHUB_TOKEN }}
  secret_name: YOUR_SECRET_NAME
  secret_value: "value to be encoded"
```

## Example real-life usage

Example workflow that runs every 8 hours and refreshes secret that holds generated ECR password.

It should be running on your own runner that has correct setup for AWS ECR login.

```yaml
name: Refresh ECR docker password

on:
  # For manual dispatch
  workflow_dispatch:
  schedule:
    # Run every 8 hours
    - cron: '0 */8 * * *'
jobs:
  create-ecr-password:
    runs-on: self-hosted
    steps:
      - name: Checkout the repository
        uses: actions/checkout@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-central-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Get current ECR password
        id: ecr-password
        run: echo "::set-output name=password::$(aws ecr get-login-password)"

      - name: Save the ECR password secret
        id: save-secret
        uses: Skandalik/save-secret@v1.0.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          secret_name: ECR_PASSWORD
          secret_value: ${{ steps.ecr-password.outputs.password }} 
```
