import { Octokit } from "@octokit/core";
import { paginateGraphQLInterface } from "@octokit/plugin-paginate-graphql";
import memoize from "memoize";
import fs from "node:fs";
import { join } from "path/posix";

export type PaginatedOctokit = Octokit & paginateGraphQLInterface;

export const getGraphql = memoize((name: string): string => {
    const path = join(import.meta.dirname, "graphql", name);
    return fs.readFileSync(path).toString();
});

export const getCollaborators = memoize(async (octokit: PaginatedOctokit, owner: string, repo: string) => {
    const query = getGraphql("maintainers.gql");
    const resp2 = await octokit.graphql.paginate(query, { owner: owner, repo: repo });
    const allowedPermissions = ['TRIAGE', 'WRITE', 'MAINTAIN', 'ADMIN'];
    return resp2.repository.collaborators.edges
        .filter((edge: any) => allowedPermissions.includes(edge.permission))
        .map((edge: any) => edge.node.login);
}, {
    // By default, all JS memoize functions only memoize on the first arg wtf?
    cacheKey: args => JSON.stringify(args)
});
