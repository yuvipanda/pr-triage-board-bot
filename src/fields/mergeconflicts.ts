import { PaginatedOctokit } from "../utils.js";
import { MergeConflictsValue } from "../fieldconfig.js";

export const getMergeConflicts = async (octokit: PaginatedOctokit, pr: any) : Promise<MergeConflictsValue | null> => {
    switch(pr.mergeable) {
        case "CONFLICTING":
            return "Merge Conflicts"
        case "MERGEABLE":
            return "No Merge Conflicts"
        case "UNKNOWN":
            return null;
    }
    // This should never be reached, because
    // we exhaustively check all options above per https://docs.github.com/en/graphql/reference/enums#mergeablestate
    // But explicitly return null anyway because the external API may change
    return null
}