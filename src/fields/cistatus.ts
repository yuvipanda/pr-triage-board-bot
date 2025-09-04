import { PaginatedOctokit } from "../utils.js";
import { CIStatusValue } from "../fieldconfig.js";

export const getCIStatus = async (octokit: PaginatedOctokit, pr: any) : Promise<CIStatusValue | null> => {
    if (pr.statusCheckRollup) {
        if (pr.statusCheckRollup.state === "SUCCESS") {
            return "Tests Passing"
        } else if (pr.statusCheckRollup.state === "FAILURE") {
            return "Tests Failing"
        } else {
            console.log('found unhandled rollup state');
            console.log(pr.statusCheck.state)
            console.log(pr.url);
            return null;
        }
    } else {
        return null;
    }
}