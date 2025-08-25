# pr-triage-syncer

Populate useful fields on a GitHub project board so maintainers
can triage open PRs better.

## What is this?

To be filled out, but see these two yet to be published blog posts
from 2i2c for context:

1. https://github.com/2i2c-org/2i2c-org.github.io/pull/415
2. https://github.com/2i2c-org/2i2c-org.github.io/pull/412

## Running this locally

### Create a GitHub App for authentication

1. [Create a GitHub App in your organization](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) (not in your user) in `Settings > Developer > GitHub Apps` with the following details:

   a. Permissions:
      i. "Repository Permissions" -> "Metadata" -> "Read-only" (to get list of collaborators for a repo)
      ii. "Organization Permissions" -> "Projects" -> "Read and write" (to manage the GitHub project)
   b. Disable webhooks as we will not be using them.
   c. Restricted to being installable just in your organization.

2. After creating the app, you are on the app settings page:
   1. Create a private key and save this file.
   2. Note the "App ID". We will be using this to authenticate.
   3. Install the app in your organization (having access to all repos) using the `Install App` sidebar item.

3. Find the numerical app installation id for your organization. You can find
   this by looking at the last number in the URL for the installation settings - it would look
   like `https://github.com/organizations/<organization>/settings/installations/<gh-installation-id>`

### Create the Project Board

This process is currently manual and finnicky, but is documented here so
that we don't let the perfect be the enemy of the good. The code depends
on particular Project Fields being set up for the project with particular
field options, and this should be managed by the code itself. It doesn't
yet.

So for now, go to the [JupyterHub project board](https://github.com/orgs/jupyterhub/projects/4/views/9) and ["Make a copy"](https://docs.github.com/en/issues/planning-and-tracking-with-projects/creating-projects/copying-an-existing-project) in your organization.

Note the project id in the url of your copy, which will look something like: `https://github.com/orgs/<organization>/projects/<project-id>/views/1`

## Run the script

Once this is done, you can run the script manually with:

```bash
npm install
npm run build
node dist/src/main.js \
  --gh-app-id <github-app-id> \
  --gh-installation-id <github-installation-id> \
  --gh-app-pem-file <path-to-private-key> \
  <github-org-name> <github-project-id>
```

where:
1. `<github-app-id>` is the numerical app id for the app you created
2. `<github-installation-id>` is the installation id after you installed the app in your organization
3. `<path-to-private-key>` is the path to the private key you downloaded for your github app
4. `<github-org-name>` is the name of your github org
5. `<github-project-id>` is the numerical id of the project you copied

This should run for a bit and get you your project output!

This is also temporary - eventually the goal is that this project publishes
a github action that you can use in a cron to maintain this.