import { PaginatedOctokit } from "../utils.js";
import type { REQUIRED_FIELDS } from "../fieldconfig.js";

export const getCIStatus: typeof REQUIRED_FIELDS["CI Status"]["getValue"] = async (octokit: PaginatedOctokit, pr: any) => {
    if (pr.statusCheckRollup) {
        if (pr.statusCheckRollup.state === "SUCCESS") {
            return "Tests Passing"
        } else if (pr.statusCheckRollup.state === "FAILURE") {
            return "Tests Failing"
        } else {
            console.log('found unhandled rollup state');
            console.log(pr.statusCheckRollup.state)
            console.log(pr.url);
            return null;
        }
    } else {
        return null;
    }
}