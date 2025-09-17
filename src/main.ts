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

async function main(organization: string, projectNumber: number, octokit: PaginatedOctokit, repositories?: string[], dryRun = false) {
    const project = await Project.getProject(organization, projectNumber, octokit);

    if (dryRun) {
        console.log("DRY RUN MODE - No changes will be made.");
    }
    // Verify and create missing fields
    console.log("Verifying project fields...");
    await project.verifyAndCreateFields();
    console.log("Field verification complete.");


    // Get current PRs from query and existing items from project
    console.log("Fetching open PRs...");
    const openPRs = await getOpenPRs(octokit, organization, repositories);
    console.log("Fetching existing project items...");
    const existingItems = await project.getExistingItems();
    console.log(`Found ${openPRs.length} open PRs and ${existingItems.length} existing project items.`);
    console.log('Syncing project fields...');

    // Create maps for efficient lookup
    const currentPRIds = new Set(openPRs.map((pr: any) => pr.id));
    const itemsToDelete: {id: string, url: string}[] = [];
    const existingItemsByPRId = new Map();

    // Build map of existing items by PR ID and find items to delete
    for (const item of existingItems) {
        if (currentPRIds.has(item.content.id)) {
            // Convert field values to a map for easy lookup
            const currentFieldValues = new Map();
            for (const fieldValue of (item.fieldValues?.nodes ?? []).filter(node => node.field?.name)) {
                const value = fieldValue.text ?? fieldValue.number ?? (fieldValue.date ? new Date(fieldValue.date) : undefined) ?? fieldValue.name;
                currentFieldValues.set(fieldValue.field.name, value);
            }
            existingItemsByPRId.set(item.content.id, {
                itemId: item.id,
                fieldValues: currentFieldValues
            });
        } else {
            itemsToDelete.push({
                id: item.id,
                url: item.content.url
            });
        }
    }

    // Sort items to delete by URL for consistent logging
    itemsToDelete.sort((a, b) => a.url.localeCompare(b.url));

    // Delete stale items
    for (let i = 0; i < itemsToDelete.length; i++) {
        const item = itemsToDelete[i];
        console.log(`[${i + 1} / ${itemsToDelete.length}] Removing ${item.url}`);
        if (!dryRun) {
            await project.deleteItem(item.id);
        }
    }

    let count = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Sort PRs by url so our progress logs are easier to follow
    openPRs.sort((a: any, b: any) => a.url.localeCompare(b.url));
    for (const pr of openPRs) {
        count += 1;
        
        // Get or create the project item
        const existingItem = existingItemsByPRId.get(pr.id);
        const itemId = existingItem ? existingItem.itemId : (!dryRun && await project.addContent(pr.id));
        
        // Process each field, only updating if value has changed
        for (const [fieldName, fieldConfig] of Object.entries(REQUIRED_FIELDS)) {
            // A null newValue corresponds to undefined (cleared) currentValue
            const newValue = (await fieldConfig.getValue(octokit, pr));
            const currentValue = existingItem?.fieldValues.get(fieldName);
            
            // Compare values - handle different types appropriately.
            // A null newValue corresponds to an undefined currentValue
            if ((newValue instanceof Date && currentValue instanceof Date) ? currentValue.getTime() === newValue.getTime() : currentValue === (newValue ?? undefined)) {
                skippedCount++;
            } else {
                console.log(`[${count} / ${openPRs.length}] Setting ${fieldName} to ${newValue} for ${pr.url}`);
                if (!dryRun) {
                    await project.setItemValue(itemId, fieldName, newValue);
                }
                updatedCount++;
            }
        }
    }
    
    console.log(`\nSummary: Updated ${updatedCount} field values, skipped ${skippedCount} unchanged values`);
}


program
    .option("--dry-run", "Do not actually make any changes")
    .option("--gh-app-id <number>", "GitHub App ID to use for authentication", parseInt)
    .option("--gh-app-installation-id <number>", "GitHub App Installation ID to use for authentication", parseInt)
    .option("--gh-app-pem-file <string>", "Path to .pem file containing private key to use for authentication")
    .option("--repositories <repos>", "Comma-separated list of repository names to limit querying to (e.g., 'repo1,repo2')")
    .argument("<organization>")
    .argument("<projectNumber>")
    .action(async (organization, projectNumber) => {
        const options = program.opts();
        const repositories = options.repositories ? options.repositories.split(',').map((repo: string) => repo.trim()) : undefined;
        await main(organization, parseInt(projectNumber), makeOctokit(
            options.ghAppId,
            options.ghAppInstallationId,
            options.ghAppPemFile
        ), repositories, options.dryRun);
    });

program.parse();