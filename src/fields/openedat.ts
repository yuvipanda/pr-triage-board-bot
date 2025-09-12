import { PaginatedOctokit } from "../utils.js";
import type { REQUIRED_FIELDS } from "../fieldconfig.js";

export const getOpenedAt: typeof REQUIRED_FIELDS["Opened At"]["getValue"] = async (octokit: PaginatedOctokit, pr: any) => {
    const d = new Date(pr.createdAt);
    // Since the project field stores just the date, remove the time component
    d.setUTCHours(0, 0, 0, 0);
    return d;
}