import { PaginatedOctokit } from "../utils.js";
import { TotalLinesChangedValue } from "../fieldconfig.js";

export async function getTotalLinesChanged(octokit: PaginatedOctokit, pr: any): Promise<TotalLinesChangedValue> {
    return pr.additions + pr.deletions;
}