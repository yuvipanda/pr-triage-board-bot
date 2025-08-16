import { Octokit } from "@octokit/core";
import { env } from 'node:process';
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import memoize from "memoize";
import { Project, SingleSelectField, SingleSelectOption, Field } from "./project.js";
import { join } from "node:path";
import fs from "node:fs";

// FIXME: Make this use `gh auth token` directly if this doesn't exist
const GH_TOKEN = env.GH_TOKEN;
const PaginatedOctokit = Octokit.plugin(paginateGraphQL)
const octokit = new PaginatedOctokit({ auth: GH_TOKEN });

const getGraphql = memoize((name: string): string => {
    const path = join(import.meta.dirname, "graphql", name);
    return fs.readFileSync(path).toString();
});

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



const getProjectInfo = async (organization: string, number: number): Promise<Project> => {
    const query = getGraphql("project.gql");
    const resp: any = await octokit.graphql(query, { organization: organization, number: number });
    const fields = resp.organization.projectV2.fields.nodes.map(i => {
        if (i['options']) {
            return new SingleSelectField(i.id, i.name, i.options.map(i => new SingleSelectOption(i.id, i.name)))
        } else {
            return { id: i.id, name: i.name };
        }
    });
    return new Project(
        resp.organization.projectV2.id,
        fields
    );
}

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


const setProjectItemValue = async (projectId: string, projectItemId: string, field: Field, value: Date | string | number | SingleSelectOption) => {
    let valueDefinition;
    let valueMutation;
    if (value instanceof Date) {
        valueDefinition = "$value: Date!"
        valueMutation = "date: $value"
    } else if (typeof value === "string") {
        valueDefinition = "$value: String!";
        valueMutation = "string: $value"
    } else if (typeof value === "number") {
        valueDefinition = "$value: Float!";
        valueMutation = "number: $value"
    } else if (value instanceof SingleSelectOption) {
        valueDefinition = "$value: String!";
        valueMutation = "singleSelectOptionId: $value";
        // FIXME: This seems bad?
        value = value.id;
    }
    const query = `
      mutation($projectId: ID! $itemId: ID! $fieldId: ID! ${valueDefinition}) {
    updateProjectV2ItemFieldValue(
      input: {
        projectId:$projectId
        itemId:$itemId
        fieldId:$fieldId
        value: {
          ${valueMutation}
        }
      }
    ) {
      projectV2Item {
        id
      }
    }
  }
    `;

    const resp = await octokit.graphql(query, { projectId: projectId, itemId: projectItemId, fieldId: field.id, value: value });
    return resp;
}

// console.log(await getCollaborators("jupyterhub", "ltiauthenticator"))
// console.log(await getCollaborators("jupyterhub", "ltiauthenticator"))
// console.log(await getCollaborators("jupyterhub", "jupyterhub"))
// console.log(await getCollaborators("jupyterhub", "jupyterhub"))
// console.log(await getProjectId("jupyterhub", 4));
const project = await getProjectInfo("jupyterhub", 4);

const authorKindField = project.findField("Author Kind") as SingleSelectField;
const authorKindMaintainer = authorKindField.findOption("Maintainer");
const authorKindBot = authorKindField.findOption("Bot");
const authorKindFirst = authorKindField.findOption("First Time Contributor");
const authorKindEarly = authorKindField.findOption("Early Contributor");
const authorKindSeasoned = authorKindField.findOption("Seasoned Contributor");
const changedLinesField = project.findField("Total Changed Lines");

const maintainerEngagementField = project.findField("Maintainer Engagement") as SingleSelectField;
const maintainerNone = maintainerEngagementField.findOption("No Maintainer Engagement");
const maintainerOne = maintainerEngagementField.findOption("Single Maintainer Engagement");
const maintainerMany = maintainerEngagementField.findOption("Multiple Maintainer Engagement");

const ciStatusField = project.findField("CI Status") as SingleSelectField;
const ciStatusSuccess = ciStatusField.findOption("Tests Passing");
const ciStatusFailure = ciStatusField.findOption("Tests Failing");

const openedAtField = project.findField("Opened At");

const getAuthorKindStatus = async (pr: any) => {
    const BOTS = ["dependabot", "pre-commit-ci", "jupyterhub-bot"]
    if (BOTS.includes(pr.author.login)) {
        return authorKindBot;
    }

    const collaborators = await getCollaborators(pr.repository.owner.login, pr.repository.name);

    if (collaborators.includes(pr.author.login)) {
        return authorKindMaintainer
    }

    const prCount = await getMergedPRCount(pr.repository.owner.login, pr.author.login);
    if (prCount === 1) {
        return authorKindFirst;
    } else if (prCount < 10) {
        return authorKindEarly;
    } else {
        return authorKindSeasoned;
    }
}

const getMaintainerEngagement = async (pr: any) => {
    const collaborators = new Set(await getCollaborators(pr.repository.owner.login, pr.repository.name));

    collaborators.delete(pr.author.login);

    const participants = new Set(pr.participants.nodes.map(i => i['login']));

    const collabParticipants = collaborators.intersection(participants);

    if (collabParticipants.size === 0) {
        return maintainerNone;
    } else if (collabParticipants.size === 1) {
        return maintainerOne;
    } else {
        return maintainerMany;
    }

}

// console.log(await getMergedPRCount("jupyterhub", "yuvipanda"));
const openPRs = await getOpenPRs();
for (const pr of openPRs) {
    const itemId = await addContentToProject(project.id, pr.id);
    console.log(pr)

    console.log(await setProjectItemValue(
        project.id, itemId, maintainerEngagementField, await getMaintainerEngagement(pr)
    ))

    console.log(await setProjectItemValue(
        project.id, itemId, authorKindField, await getAuthorKindStatus(pr)
    ))

    console.log(await setProjectItemValue(
        project.id, itemId, openedAtField, new Date(pr.createdAt)
    ))

    console.log(await setProjectItemValue(
        project.id, itemId, changedLinesField, pr.additions + pr.deletions
    ))

    if (pr.statusCheckRollup) {
        if (pr.statusCheckRollup.state === "SUCCESS") {
            console.log(await setProjectItemValue(
                project.id, itemId, ciStatusField, ciStatusSuccess
            ));
        } else if (pr.statusCheckRollup.state === "FAILURE") {
            console.log(await setProjectItemValue(
                project.id, itemId, ciStatusField, ciStatusFailure
            ));
        } else {
            console.log('found unhandled rollup state');
            console.log(pr.statusCheck.state)
            console.log(pr.url);
        }
    }
}