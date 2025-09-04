import { PaginatedOctokit } from "../utils.js";
import { OpenedAtValue } from "../fieldconfig.js";

export async function getOpenedAt(octokit: PaginatedOctokit, pr: any) : Promise<OpenedAtValue> {
    return new Date(pr.createdAt)
}