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

    // Create maps for efficient lookup
    const currentPRIds = new Set(openPRs.map((pr: any) => pr.id));
    const itemsToDelete: {id: string, url: string}[] = [];
    const existingItemsByPRId = new Map();

    // Build map of existing items by PR ID and find items to delete
    for (const item of existingItems) {
        if (item.content && item.content.id) {
            if (currentPRIds.has(item.content.id)) {
                // Convert field values to a map for easy lookup
                const currentFieldValues = new Map();
                if (item.fieldValues && item.fieldValues.nodes) {
                    for (const fieldValue of item.fieldValues.nodes) {
                        if (fieldValue.field && fieldValue.field.name) {
                            let value;
                            if ('text' in fieldValue) value = fieldValue.text;
                            else if ('number' in fieldValue) value = fieldValue.number;
                            else if ('date' in fieldValue) value = new Date(fieldValue.date);
                            else if ('name' in fieldValue) value = fieldValue.name;
                            
                            currentFieldValues.set(fieldValue.field.name, value);
                        }
                    }
                }
                existingItemsByPRId.set(item.content.id, {
                    itemId: item.id,
                    fieldValues: currentFieldValues
                });
            } else {
                itemsToDelete.push({
                    id: item.id,
                    url: item.content.url || 'Unknown URL'
                });
            }
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
    let updatedCount = 0;
    let skippedCount = 0;

    // Sort PRs by url so our progress logs are easier to follow
    openPRs.sort((a: any, b: any) => a.url.localeCompare(b.url));
    for (const pr of openPRs) {
        count += 1;
        
        // Get or create the project item
        const existingItem = existingItemsByPRId.get(pr.id);
        const itemId = existingItem ? existingItem.itemId : await project.addContent(pr.id);
        
        // Process each field, only updating if value has changed
        for (const [fieldName, fieldConfig] of Object.entries(REQUIRED_FIELDS)) {
            const newValue = await fieldConfig.getValue(octokit, pr);
            const currentValue = existingItem?.fieldValues.get(fieldName);
            
            // Compare values - handle different types appropriately
            let valuesMatch = false;
            if (currentValue === undefined && newValue === null) {
                valuesMatch = true;
            } else if (currentValue !== undefined && newValue !== null) {
                if (newValue instanceof Date && currentValue instanceof Date) {
                    // GitHub Project date fields only store date (not time), so compare by day
                    const currentDay = currentValue.toISOString().split('T')[0];
                    const newDay = newValue.toISOString().split('T')[0];
                    valuesMatch = currentDay === newDay;
                } else {
                    valuesMatch = String(currentValue) === String(newValue);
                }
            }
            
            if (!valuesMatch) {
                console.log(`[${count} / ${openPRs.length}] Setting ${fieldName} to ${newValue} for ${pr.url}`);
                await project.setItemValue(itemId, fieldName, newValue);
                updatedCount++;
            } else {
                skippedCount++;
            }
        }
    }
    
    console.log(`\nSummary: Updated ${updatedCount} field values, skipped ${skippedCount} unchanged values`);
    console.log(`Performance improvement: ${Math.round(skippedCount / (updatedCount + skippedCount) * 100)}% of updates avoided`);
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