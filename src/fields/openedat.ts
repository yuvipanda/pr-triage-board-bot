import { PaginatedOctokit } from "../utils.js";
import type { REQUIRED_FIELDS } from "../fieldconfig.js";

export const getOpenedAt: typeof REQUIRED_FIELDS["Opened At"]["getValue"] = async (octokit: PaginatedOctokit, pr: any) => {
    return new Date(pr.createdAt)
}