# pr-triage-syncer

Populate useful fields on a GitHub project board so maintainers
can triage open PRs better.

Some example project boards that result from this bot are:
* [JupyterHub](https://github.com/orgs/jupyterhub/projects/4)
* [JupyterLab](https://github.com/orgs/jupyterlab/projects/11)


## What is this?

To be filled out, but see these two yet to be published blog posts
from 2i2c for context:

1. https://github.com/2i2c-org/2i2c-org.github.io/pull/415
2. https://github.com/2i2c-org/2i2c-org.github.io/pull/412

## Set up

### Create a GitHub App for authentication

1. [Create a GitHub App in your organization](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) (not in your user) in `Settings > Developer > GitHub Apps` with the following details:

   a. Permissions:
    - i. "Repository Permissions" -> "Metadata" -> "Read-only" (to get list of collaborators for a repo)  
    - ii. "Organization Permissions" -> "Projects" -> "Read and write" (to manage the GitHub project)

   b. Disable webhooks as we will not be using them.

   c. Restrict the app to being installable just in your organization.

2. After creating the app, you are on the app settings page:
   1. Create a private key and save this file.
   2. Note the "App ID". We will be using this to authenticate.
   3. Install the app in your organization (having access to all repos) using the `Install App` sidebar item.

3. Find the numerical app installation id for your organization. You can find
   this by looking at the last number in the URL for the installation settings - it would look
   like `https://github.com/organizations/<organization>/settings/installations/<gh-installation-id>`

### Create the Project Board

This process is currently manual and finnicky, but is documented here so
that we don't let the perfect be the enemy of the good.

So for now, go to the [JupyterHub project board](https://github.com/orgs/jupyterhub/projects/4/views/9) and ["Make a copy"](https://docs.github.com/en/issues/planning-and-tracking-with-projects/creating-projects/copying-an-existing-project) in your organization.

Note the project id in the url of your copy, which will look something like: `https://github.com/orgs/<organization>/projects/<project-id>/views/1`

## Run as a local script

Once the setup is done, you can run the script manually with:

```bash
npm install
npm run build
node dist/src/main.js \
  --gh-app-id <github-app-id> \
  --gh-installation-id <github-installation-id> \
  --gh-app-pem-file <path-to-private-key> \
  [--repositories <repo1,repo2,repo3>] \
  <github-org-name> <github-project-id>
```

where:
1. `<github-app-id>` is the numerical app id for the app you created
2. `<github-installation-id>` is the installation id after you installed the app in your organization
3. `<path-to-private-key>` is the path to the private key you downloaded for your github app
4. `<repo1,repo2,repo3>` (optional) is a comma-separated list of repository names to limit querying to specific repositories instead of all repositories in the organization
5. `<github-org-name>` is the name of your github org
6. `<github-project-id>` is the numerical id of the project you copied

This should run for a bit and get you your project output!

## Run as a GitHub Workflow

You can also run this bot using [GitHub workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows). Create a workflow file like the following to run the bot every hour and to be able to manually trigger a run:

```yaml
name: PR Triage Bot

on:
  schedule:
    - cron: '0 * * * *'  # Run every hour
  workflow_dispatch: true

jobs:
  pr-triage:
    uses: yuvipanda/pr-triage-board-bot/.github/workflows/reusable-pr-triage.yml@main
    with:
      organization: 'your-org-name'
      project-number: '1'
      gh-app-id: '12345'
      gh-installation-id: '67890'
      repositories: 'repo1,repo2'  # Optional: limit to specific repos
    secrets:
      gh-app-private-key: ${{ secrets.GH_APP_PRIVATE_KEY }}
```

### Workflow Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `organization` | GitHub organization name | Yes | |
| `project-number` | GitHub Project board number | Yes | |
| `gh-app-id` | GitHub App ID for authentication | Yes | |
| `gh-installation-id` | GitHub App Installation ID for authentication | Yes | |
| `repositories` | Comma-separated list of repository names to limit querying to (optional) | No | |
| `node-version` | Node.js version to use | No | `23.x` |

### Required Secrets

| Secret | Description | Required |
|--------|-------------|----------|
| `gh-app-private-key` | GitHub App private key (PEM format) for authentication | Yes |
