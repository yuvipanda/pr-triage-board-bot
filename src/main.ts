import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import { Project } from "./project.js";
import { getGraphql, PaginatedOctokit } from "./utils.js";
import { getAuthorKind } from './fields/authorkind.js';
import { getOpenedAt } from './fields/openedat.js';
import { getTotalLinesChanged } from './fields/totallineschanged.js';
import { getMaintainerEngagement } from './fields/maintainerengagement.js';
import { getCIStatus } from './fields/cistatus.js';
import { getMergeConflicts } from './fields/mergeconflicts.js'
import { getApprovalStatus } from './fields/approvalstatus.js';
import { getFilesChangedType } from './fields/fileschangedtype.js';
import { program } from "commander";
import fs from "node:fs";


async function getOpenPRs(octokit: PaginatedOctokit, organization: string) {
    const query = getGraphql("openprs.gql")
    const searchQuery = `org:${organization} is:pr state:open archived:false`
    const resp = await octokit.graphql.paginate(query, {searchQuery})
    // const resp = await octokit.graphql(query, {})
    return resp.search.nodes;
}

function makeOctokit(appId: number, installationId: number, keyPath: string) {
    const PaginatedOctokitConstructor = Octokit.plugin(paginateGraphQL)
    return new PaginatedOctokitConstructor({
        authStrategy: createAppAuth,
        auth: {
            appId: appId,
            installationId: installationId,
            privateKey: fs.readFileSync(keyPath).toString()
        }
    });
}

async function main(organization: string, projectNumber: number, octokit: PaginatedOctokit) {
    const project = await Project.getProject(organization, projectNumber, octokit);

    const fields: { [id: string]: (octokit: PaginatedOctokit, pr: any) => Promise<string | Date | number | null> } = {
        "Author Kind": getAuthorKind,
        "Opened At": getOpenedAt,
        "Total Lines Changed": getTotalLinesChanged,
        "Maintainer Engagement": getMaintainerEngagement,
        "CI Status": getCIStatus,
        "Merge Conflicts": getMergeConflicts,
        "Approval Status": getApprovalStatus
    }

    // Get current PRs from query and existing items from project
    const openPRs = await getOpenPRs(octokit, organization);
    const existingItems = await project.getExistingItems();

    // Create sets for efficient lookup
    const currentPRIds = new Set(openPRs.map((pr: any) => pr.id));
    const itemsToDelete: string[] = [];

    // Find items that are no longer in the current PR query
    for (const item of existingItems) {
        if (item.content && item.content.id && !currentPRIds.has(item.content.id)) {
            itemsToDelete.push(item.id);
            console.log(`Marking for deletion: ${item.content.url || 'Unknown URL'}`);
        }
    }

    // Delete stale items
    for (const itemId of itemsToDelete) {
        console.log(`Deleting stale project item: ${itemId}`);
        await project.deleteItem(itemId);
    }

    if (itemsToDelete.length > 0) {
        console.log(`Deleted ${itemsToDelete.length} stale items from project`);
    }

    let count = 0;

    // Sort PRs by url so our progress logs are easier to follow
    openPRs.sort((a: any, b: any) => a.url.localeCompare(b.url));
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


program
    .option("--gh-app-id <number>", "GitHub App ID to use for authentication", parseInt)
    .option("--gh-installation-id <number>", "GitHub App Installation ID to use for authentication", parseInt)
    .option("--gh-app-pem-file <string>", "Path to .pem file containing private key to use for authentication")
    .argument("<organization>")
    .argument("<projectNumber>")
    .action(async (organization, projectNumber) => {
        const options = program.opts();
        await main(organization, parseInt(projectNumber), makeOctokit(
            options.ghAppId,
            options.ghInstallationId,
            options.ghAppPemFile
        ))
    });

program.parse();