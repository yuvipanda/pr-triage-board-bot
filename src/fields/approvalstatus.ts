import { PaginatedOctokit } from "../utils.js";
import { ApprovalStatusValue } from "../fieldconfig.js";

export const getApprovalStatus = async (octokit: PaginatedOctokit, pr: any) : Promise<ApprovalStatusValue | null> => {
    const maintainerReviews : Array<string> = [];
    if (pr.reviews.nodes) {
        for (const review of pr.reviews.nodes) {
            if (review.authorCanPushToRepository && !review.isMinimized) {
                maintainerReviews.push(review.state)
            }
        }
        if (maintainerReviews) {
            // If there is a single changes requested, it's changes requested
            if (maintainerReviews.filter(state => state === "CHANGES_REQUESTED").length > 0) {
                return "Changes Requested";
            }

            // If we get here, it means there are no changes requested
            // So if there's a single approval, it's approved
            if (maintainerReviews.filter(state => state === "APPROVED").length > 0) {
                return "Maintainer Approved";
            }
        }
    }
    // Either there were no reviews, or there were no approvals nor changes requested;
    return null;
}