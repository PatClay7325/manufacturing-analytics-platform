# Deployment Secrets Setup

This document explains how to set up the necessary secrets for the CD workflow to deploy your application to Vercel.

## Required Secrets

The CD workflow requires the following secrets to be set up in your GitHub repository:

### 1. `VERCEL_TOKEN`

This is a personal access token from Vercel that allows GitHub Actions to deploy your application.

#### How to get a Vercel token:

1. Go to [Vercel](https://vercel.com) and log in
2. Click on your profile picture in the top right corner
3. Click on "Settings"
4. Click on "Tokens" in the left sidebar
5. Click "Create" to create a new token
6. Give it a name like "GitHub Actions"
7. Choose "Full Access" for scope
8. Click "Create Token"
9. Copy the token (you won't be able to see it again)

### 2. (Optional) `SLACK_WEBHOOK_URL`

If you want to receive Slack notifications for production deployments, you'll need a Slack webhook URL.

#### How to get a Slack webhook URL:

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" and choose "From scratch"
3. Give it a name and select your workspace
4. Click "Incoming Webhooks" in the left sidebar
5. Toggle "Activate Incoming Webhooks" to on
6. Click "Add New Webhook to Workspace"
7. Choose the channel where you want to receive notifications
8. Click "Allow"
9. Copy the webhook URL

## Adding Secrets to GitHub

1. Go to your GitHub repository
2. Click on "Settings"
3. Click on "Secrets and variables" then "Actions" in the left sidebar
4. Click "New repository secret"
5. Add each secret:
   - Name: `VERCEL_TOKEN`
   - Value: (paste your Vercel token)
   - Click "Add secret"
6. Repeat for any other secrets

## Vercel Project Setup

Before your first deployment, you need to set up your project on Vercel:

1. Install the Vercel CLI locally:
   ```bash
   npm install -g vercel
   ```

2. Log in to Vercel:
   ```bash
   vercel login
   ```

3. Initialize your project:
   ```bash
   vercel
   ```
   Follow the prompts to set up your project.

4. Configure environment variables:
   - Go to your project on the Vercel dashboard
   - Click on "Settings" and then "Environment Variables"
   - Add any required environment variables for both Production and Preview environments

## Troubleshooting

If your deployment fails, check the following:

1. Verify that your `VERCEL_TOKEN` is correct and has not expired
2. Check if your Vercel project is set up correctly
3. Look at the GitHub Actions logs for detailed error messages
4. Ensure your project builds successfully locally
5. Verify any environment variables required by your application are set in Vercel

For more information, see the [Vercel documentation](https://vercel.com/docs) and [GitHub Actions documentation](https://docs.github.com/en/actions).