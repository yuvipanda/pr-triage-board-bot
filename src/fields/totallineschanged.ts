import { PaginatedOctokit } from "../utils.js";

export async function getTotalLinesChanged(octokit: PaginatedOctokit, pr: any): Promise<number> {
    return pr.additions + pr.deletions;
}