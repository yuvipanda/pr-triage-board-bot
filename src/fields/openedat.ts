import { PaginatedOctokit } from "../utils.js";

export async function getOpenedAt(octokit: PaginatedOctokit, pr: any) : Promise<Date> {
    return new Date(pr.createdAt)
}