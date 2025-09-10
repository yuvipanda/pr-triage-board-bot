import { PaginatedOctokit } from "../utils.js";
import type { REQUIRED_FIELDS } from "../fieldconfig.js";

export const getTotalLinesChanged: typeof REQUIRED_FIELDS["Total Lines Changed"]["getValue"] = async (octokit: PaginatedOctokit, pr: any) => {
    return pr.additions + pr.deletions;
}