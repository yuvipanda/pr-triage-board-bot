import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import { Project } from "./project.js";
import { getGraphql, PaginatedOctokit } from "./utils.js";
import { REQUIRED_FIELDS } from "./fieldconfig.js";
import { program } from "commander";
import fs from "node:fs";


async function getOpenPRs(octokit: PaginatedOctokit, organization: string, repositories?: string[]) {
    const query = getGraphql("openprs.gql")
    let searchQuery: string;
    
    if (repositories && repositories.length > 0) {
        // If specific repositories are provided, query only those
        const repoQueries = repositories.map(repo => `repo:${organization}/${repo}`).join(' ');
        searchQuery = `${repoQueries} is:pr state:open archived:false`;
    } else {
        // Default behavior: query all repositories in the organization
        searchQuery = `org:${organization} is:pr state:open archived:false`;
    }
    
    const resp = await octokit.graphql.paginate(query, {searchQuery})
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

async function main(organization: string, projectNumber: number, octokit: PaginatedOctokit, repositories?: string[]) {
    const project = await Project.getProject(organization, projectNumber, octokit);

    // Verify and create missing fields
    console.log("Verifying project fields...");
    await project.verifyAndCreateFields();
    console.log("Field verification complete.");


    // Get current PRs from query and existing items from project
    const openPRs = await getOpenPRs(octokit, organization, repositories);
    const existingItems = await project.getExistingItems();

    // Create sets for efficient lookup
    const currentPRIds = new Set(openPRs.map((pr: any) => pr.id));
    const itemsToDelete: {id: string, url: string}[] = [];

    // Find items that are no longer in the current PR query
    for (const item of existingItems) {
        if (item.content && item.content.id && !currentPRIds.has(item.content.id)) {
            itemsToDelete.push({
                id: item.id,
                url: item.content.url || 'Unknown URL'
            });
        }
    }

    // Sort items to delete by URL for consistent logging
    itemsToDelete.sort((a, b) => a.url.localeCompare(b.url));

    // Delete stale items
    for (let i = 0; i < itemsToDelete.length; i++) {
        const item = itemsToDelete[i];
        console.log(`[${i + 1} / ${itemsToDelete.length}] Removing ${item.url}`);
        await project.deleteItem(item.id);
    }

    let count = 0;

    // Sort PRs by url so our progress logs are easier to follow
    openPRs.sort((a: any, b: any) => a.url.localeCompare(b.url));
    for (const pr of openPRs) {
        count += 1;
        const itemId = await project.addContent(pr.id);
        for (const [fieldName, fieldConfig] of Object.entries(REQUIRED_FIELDS)) {
            const value = await fieldConfig.getValue(octokit, pr);
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
    .option("--repositories <repos>", "Comma-separated list of repository names to limit querying to (e.g., 'repo1,repo2')")
    .argument("<organization>")
    .argument("<projectNumber>")
    .action(async (organization, projectNumber) => {
        const options = program.opts();
        const repositories = options.repositories ? options.repositories.split(',').map((repo: string) => repo.trim()) : undefined;
        await main(organization, parseInt(projectNumber), makeOctokit(
            options.ghAppId,
            options.ghInstallationId,
            options.ghAppPemFile
        ), repositories)
    });

program.parse();