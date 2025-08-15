import { Octokit } from "@octokit/core";
import { env } from 'node:process';
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import memoize from "memoize";
import { inherits } from "node:util";

// FIXME: Make this use `gh auth token` directly if this doesn't exist
const GH_TOKEN = env.GH_TOKEN;
const PaginatedOctokit = Octokit.plugin(paginateGraphQL)
const octokit = new PaginatedOctokit({ auth: GH_TOKEN });

async function getOpenPRs() {
    const PR_GRAPHQL = `
query ($cursor: String) {
 search(type:ISSUE first:100 query:"org:jupyterhub is:pr state:open" after:$cursor){
  nodes {
    ... on PullRequest {
      id,
      url,
      createdAt,
      lastEditedAt,
      deletions,
      additions,
      statusCheckRollup {
        state
      }
      repository {
        id,
        name,
        owner {
            login
        }
      },
      author {
        login
      },
      title,
    }
  }
  pageInfo {
    hasNextPage
    endCursor
  }
  }
}
`;

    const resp = await octokit.graphql.paginate(PR_GRAPHQL, {})
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
    const resp = await octokit.graphql(query);
    return resp.search.issueCount;
}, {
    // By default, all JS memoize functions only memoize on the first arg wtf?
    cacheKey: args => JSON.stringify(args)
});

const getCollaborators = memoize(async (owner: string, repo: string) => {
    const COLLABORATORS = `
query ($cursor: String $owner: String! $repo: String!) {
    repository(name:$repo owner:$owner) {
        collaborators(after:$cursor first:100) {
            nodes {
                login
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
}
`
    const resp2 = await octokit.graphql.paginate(COLLABORATORS, { owner: owner, repo: repo });
    return resp2.repository.collaborators.nodes.map((i: any) => i.login);
}, {
    // By default, all JS memoize functions only memoize on the first arg wtf?
    cacheKey: args => JSON.stringify(args)
});

interface ProjectField {
    id: string
    name: string

}
class ProjectSingleSelectFieldOption {
    id: string
    name: string

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }
}

class ProjectSingleSelectField implements ProjectField {
    id: string
    name: string
    options: ProjectSingleSelectFieldOption[];

    constructor(id: string, name: string, options: ProjectSingleSelectFieldOption[]) {
        this.id = id;
        this.name = name;
        this.options = options;
    }

    findOption(name: string): ProjectSingleSelectFieldOption {
        for (const option of this.options) {
            if (option.name === name) {
                return option
            }
        }
        throw "Learn how to error handle this properly? Or express this via types?";
    }
}

class Project {
    id: string;
    fields: ProjectField[];

    constructor(id: string, fields: ProjectField[]) {
        this.id = id;
        this.fields = fields;
    };

    findField(name: string): ProjectField {
        for (const field of this.fields) {
            if (field.name === name) {
                return field
            }
        }
        throw "Learn how to error handle this properly? Or express this via types?";
    }

}

const getProjectInfo = async (organization: string, number: number): Promise<Project> => {
    const query = `
    query($organization: String! $number: Int!){
      organization(login: $organization){
        projectV2(number: $number) {
            id,
            fields(first:100) {
                nodes {
                    ... on ProjectV2Field {
                        id,
                        name
                    }
                    ... on ProjectV2SingleSelectField {
                        id,
                        name,
                        options {
                            id,
                            name
                        }
                    }
                }
            }
        }
      }
    }
    `;
    const resp = await octokit.graphql(query, { organization: organization, number: number });
    const fields = resp.organization.projectV2.fields.nodes.map(i => {
        if (i['options']) {
            return new ProjectSingleSelectField(i.id, i.name, i.options.map(i => new ProjectSingleSelectFieldOption(i.id, i.name)))
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
    const resp = await octokit.graphql(query, { projectId: projectId, contentId: contentId })
    return resp.addProjectV2ItemById.item.id;
}


const setProjectItemValue = async (projectId: string, projectItemId: string, field: ProjectField, value: Date | string | number | ProjectSingleSelectFieldOption) => {
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
    } else if (value instanceof ProjectSingleSelectFieldOption) {
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

const authorKindField = project.findField("Author Kind") as ProjectSingleSelectField;
const authorKindMaintainer = authorKindField.findOption("Maintainer");
const authorKindBot = authorKindField.findOption("Bot");
const authorKindFirst = authorKindField.findOption("First Time Contributor");
const authorKindEarly = authorKindField.findOption("Early Contributor");
const authorKindSeasoned = authorKindField.findOption("Seasoned Contributor");
const changedLinesField = project.findField("Total Changed Lines");

const ciStatusField = project.findField("CI Status") as ProjectSingleSelectField;
const ciStatusSuccess = ciStatusField.findOption("Tests Passing");
const ciStatusFailure = ciStatusField.findOption("Tests Failing");

const openedAtField = project.findField("Opened At");

const getAuthorKindStatus = async (pr: any) => {
    const BOTS = ["dependabot", "pre-commit-ci"]
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

// console.log(await getMergedPRCount("jupyterhub", "yuvipanda"));
const openPRs = await getOpenPRs();
for (const pr of openPRs) {
    const itemId = await addContentToProject(project.id, pr.id);
    console.log(pr)

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
        }
    }
}