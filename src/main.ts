import { Octokit } from "@octokit/core";
import { env } from 'node:process';
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import { Project } from "./project.js";
import { getGraphql, PaginatedOctokit } from "./utils.js";
import { getAuthorKind } from './fields/authorkind.js';
import { getOpenedAt } from './fields/openedat.js';
import { getTotalLinesChanged } from './fields/totallineschanged.js';
import { getMaintainerEngagement } from './fields/maintainerengagement.js';
import { getCIStatus } from './fields/cistatus.js';
import { getMergeConflicts } from './fields/mergeconflicts.js'
import { program } from "commander";


async function getOpenPRs(octokit: PaginatedOctokit) {
    const query = getGraphql("openprs.gql")
    const resp = await octokit.graphql.paginate(query, {})
    return resp.search.nodes;
}

async function main(organization: string, projectNumber: number) {
    // FIXME: Make this use `gh auth token` directly if this doesn't exist
    const GH_TOKEN = env.GH_TOKEN;
    const PaginatedOctokitConstructor = Octokit.plugin(paginateGraphQL)
    const octokit = new PaginatedOctokitConstructor({ auth: GH_TOKEN });

    const project = await Project.getProject(organization, projectNumber, octokit);

    const fields: { [id: string]: (octokit: PaginatedOctokit, pr: any) => Promise<string | Date | number| null> } = {
        "Author Kind": getAuthorKind,
        "Opened At": getOpenedAt,
        "Total Lines Changed": getTotalLinesChanged,
        "Maintainer Engagement": getMaintainerEngagement,
        "CI Status": getCIStatus,
        "Merge Conflicts": getMergeConflicts
    }

    const openPRs = await getOpenPRs(octokit);
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
}


program.argument("<organization>").argument("<projectNumber>").action(async (organization, projectNumber) => {
    await main(organization, parseInt(projectNumber))
});

program.parse();