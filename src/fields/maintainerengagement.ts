import { getCollaborators, PaginatedOctokit } from "../utils.js";
import type { REQUIRED_FIELDS } from "../fieldconfig.js";

export const getMaintainerEngagement: typeof REQUIRED_FIELDS["Maintainer Engagement"]["getValue"] = async (octokit: PaginatedOctokit, pr: any) => {
    const collaborators = new Set(await getCollaborators(octokit, pr.repository.owner.login, pr.repository.name));

    collaborators.delete(pr.author.login);

    const participants = new Set(pr.participants.nodes.map(i => i['login']));

    const collabParticipants = collaborators.intersection(participants);

    if (collabParticipants.size === 0) {
        return "No Maintainer Engagement";
    } else if (collabParticipants.size === 1) {
        return "Single Maintainer Engagement";
    } else {
        return "Multiple Maintainer Engagement";
    }

}