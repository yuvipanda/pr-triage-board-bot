import { Octokit } from "@octokit/core";
import { PaginatedOctokit, getCollaborators } from "../utils.js";

import memoize from "memoize";


const getMergedPRCount = memoize(async (octokit: Octokit, organization: string, username: string) => {
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

export const getAuthorKind = async (octokit: PaginatedOctokit, pr: any) => {
    const BOTS = ["dependabot", "pre-commit-ci", "jupyterhub-bot"]
    if (BOTS.includes(pr.author.login)) {
        return "Bot";
    }

    const collaborators = await getCollaborators(octokit, pr.repository.owner.login, pr.repository.name);

    if (collaborators.includes(pr.author.login)) {
        return "Maintainer"
    }

    const prCount = await getMergedPRCount(octokit, pr.repository.owner.login, pr.author.login);
    if (prCount === 1) {
        return "First Time Contributor";
    } else if (prCount < 10) {
        return "Early Contributor";
    } else {
        return "Seasoned Contributor";
    }
}