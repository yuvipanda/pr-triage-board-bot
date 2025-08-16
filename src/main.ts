import { Octokit } from "@octokit/core";
import { env } from 'node:process';
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import memoize from "memoize";
import { Project, SingleSelectField, SingleSelectOption, Field } from "./project.js";
import { getGraphql } from "./utils.js";

// FIXME: Make this use `gh auth token` directly if this doesn't exist
const GH_TOKEN = env.GH_TOKEN;
const PaginatedOctokit = Octokit.plugin(paginateGraphQL)
const octokit = new PaginatedOctokit({ auth: GH_TOKEN });

async function getOpenPRs() {
    const query = getGraphql("openprs.gql")
    const resp = await octokit.graphql.paginate(query, {})
    return resp.search.nodes;
}

const getMergedPRCount = memoize(async (organization: string, username: string) => {
    // FIXME: Only count successfully merged PRs?
    const query = `
    query {
        search(type:ISSUE first:100 query:"org:${organization} author:${username} is:pr state:closed"){
            issueCount
        }
    }
    `;
    const resp: any = await octokit.graphql(query);
    return resp.search.issueCount;
}, {
    // By default, all JS memoize functions only memoize on the first arg wtf?
    cacheKey: args => JSON.stringify(args)
});

const getCollaborators = memoize(async (owner: string, repo: string) => {
    const query = getGraphql("maintainers.gql");
    const resp2 = await octokit.graphql.paginate(query, { owner: owner, repo: repo });
    return resp2.repository.collaborators.nodes.map((i: any) => i.login);
}, {
    // By default, all JS memoize functions only memoize on the first arg wtf?
    cacheKey: args => JSON.stringify(args)
});




const addContentToProject = async (projectId: string, contentId: string) => {
    const query = `
  mutation ($projectId: ID! $contentId: ID!) {
    addProjectV2ItemById(input: {projectId:$projectId contentId:$contentId}) {
      item {
        id
      }
    }
  }
    `
    const resp: any = await octokit.graphql(query, { projectId: projectId, contentId: contentId })
    return resp.addProjectV2ItemById.item.id;
}



// console.log(await getCollaborators("jupyterhub", "ltiauthenticator"))
// console.log(await getCollaborators("jupyterhub", "ltiauthenticator"))
// console.log(await getCollaborators("jupyterhub", "jupyterhub"))
// console.log(await getCollaborators("jupyterhub", "jupyterhub"))
// console.log(await getProjectId("jupyterhub", 4));
const project = await Project.getProjectInfo("jupyterhub", 4, octokit);

const authorKindField = project.findField("Author Kind") as SingleSelectField;
const authorKindMaintainer = authorKindField.findOption("Maintainer");
const authorKindBot = authorKindField.findOption("Bot");
const authorKindFirst = authorKindField.findOption("First Time Contributor");
const authorKindEarly = authorKindField.findOption("Early Contributor");
const authorKindSeasoned = authorKindField.findOption("Seasoned Contributor");
const changedLinesField = project.findField("Total Changed Lines");


const ciStatusField = project.findField("CI Status") as SingleSelectField;
const ciStatusSuccess = ciStatusField.findOption("Tests Passing");
const ciStatusFailure = ciStatusField.findOption("Tests Failing");

const openedAtField = project.findField("Opened At");

const getAuthorKindStatus = async (pr: any) => {
    const BOTS = ["dependabot", "pre-commit-ci", "jupyterhub-bot"]
    if (BOTS.includes(pr.author.login)) {
        return "Bot";
    }

    const collaborators = await getCollaborators(pr.repository.owner.login, pr.repository.name);

    if (collaborators.includes(pr.author.login)) {
        return "Maintainer"
    }

    const prCount = await getMergedPRCount(pr.repository.owner.login, pr.author.login);
    if (prCount === 1) {
        return "First Time Contributor";
    } else if (prCount < 10) {
        return "Early Contributor";
    } else {
        return "Seasoned Contributor";
    }
}

const getMaintainerEngagement = async (pr: any) => {
    const collaborators = new Set(await getCollaborators(pr.repository.owner.login, pr.repository.name));

    collaborators.delete(pr.author.login);

    const participants = new Set(pr.participants.nodes.map(i => i['login']));

    const collabParticipants = collaborators.intersection(participants);

    if (collabParticipants.size === 0) {
        return "No Maintainer Engagement";
    } else if (collabParticipants.size === 1) {
        return "Single Maintainer Engagement";
    } else {
        return "Multiple Maintainer Engagement";
    }

}

// console.log(await getMergedPRCount("jupyterhub", "yuvipanda"));
const openPRs = await getOpenPRs();
for (const pr of openPRs) {
    const itemId = await addContentToProject(project.id, pr.id);
    console.log(pr)

    console.log(await project.setItemValue(
        itemId, "Maintainer Engagement", await getMaintainerEngagement(pr)
    ))

    console.log(await project.setItemValue(
        itemId, "Author Kind", await getAuthorKindStatus(pr)
    ))

    console.log(await project.setItemValue(
        itemId, "Opened At", new Date(pr.createdAt)
    ))

    console.log(await project.setItemValue(
        itemId, "Total Changed Lines", pr.additions + pr.deletions
    ))

    if (pr.statusCheckRollup) {
        if (pr.statusCheckRollup.state === "SUCCESS") {
            console.log(await project.setItemValue(
                itemId, "CI Status", "Tests Passing"
            ));
        } else if (pr.statusCheckRollup.state === "FAILURE") {
            console.log(await project.setItemValue(
                itemId, "CI Status", "Tests Failing"
            ));
        } else {
            console.log('found unhandled rollup state');
            console.log(pr.statusCheck.state)
            console.log(pr.url);
        }
    }
}