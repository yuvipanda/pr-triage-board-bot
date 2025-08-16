import { Octokit } from "@octokit/core";
import { env } from 'node:process';
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import memoize from "memoize";
import { Project, SingleSelectField, SingleSelectOption, Field } from "./project.js";
import { getCollaborators, getGraphql, PaginatedOctokit } from "./utils.js";
import { getAuthorKind } from './fields/authorkind.js';
import { getOpenedAt } from './fields/openedat.js';
import { getTotalLinesChanged } from './fields/totallineschanged.js';
import { getMaintainerEngagement } from './fields/maintainerengagement.js';
import { getCIStatus } from './fields/cistatus.js';

// FIXME: Make this use `gh auth token` directly if this doesn't exist
const GH_TOKEN = env.GH_TOKEN;
const PaginatedOctokitConstructor = Octokit.plugin(paginateGraphQL)
export const octokit = new PaginatedOctokitConstructor({ auth: GH_TOKEN });

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

const project = await Project.getProjectInfo("jupyterhub", 4, octokit);


const fields: { [id: string]: (octokit: PaginatedOctokit, pr: any) => Promise<string | Date | number| null> } = {
    "Author Kind": getAuthorKind,
    "Opened At": getOpenedAt,
    "Total Lines Changed": getTotalLinesChanged,
    "Maintainer Engagement": getMaintainerEngagement,
    "CI Status": getCIStatus
}

const openPRs = await getOpenPRs();
let count = 0;
for (const pr of openPRs) {
    count += 1;
    const itemId = await project.addContent(pr.id);
    for (const [fieldName, calcFunction] of Object.entries(fields)) {
        const value = await calcFunction(octokit, pr);
        console.log(`[${count} / ${openPRs.length}] Setting ${fieldName} to ${value} for ${pr.url}`);
        await project.setItemValue(
            itemId, fieldName, value
        )
    }

}