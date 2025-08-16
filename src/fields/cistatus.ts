import { PaginatedOctokit } from "../utils.js";

export const getCIStatus = async (octokit: PaginatedOctokit, pr: any) : Promise<string | null> => {
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