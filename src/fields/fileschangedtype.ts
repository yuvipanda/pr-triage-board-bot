import { PaginatedOctokit } from "../utils.js";
import path from "node:path";

const TYPE_EXTENSION_MAPPING = new Map<string, Array<string>>(Object.entries({
    "Documentation": [".md", ".rst"],
    "Python": [".py"],
    "Frontend": [".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".scss"]
}));

let EXTENSION_TYPE_MAPPING = new Map<string, string>();
for (const [typ, extensions] of TYPE_EXTENSION_MAPPING) {
    for (const extension of extensions) {
        EXTENSION_TYPE_MAPPING.set(extension, typ)
    }
};

export const getFilesChangedType = async (octokit: PaginatedOctokit, pr: any) : Promise<string | null> => {
    const extensionCounts = new Map<string, number>();
    if (pr.files.nodes) {
        for (const file of pr.files.nodes) {
            const ext = path.extname(file.path);
            if (extensionCounts.has(ext)) {
                extensionCounts.set(ext, extensionCounts.get(ext) + file.additions + file.deletions)
            } else {
                extensionCounts.set(ext, file.additions + file.deletions)
            }
        }
    }

    let otherExtensionsCount = 0;
    let typeCounts = new Map<string, number>(Object.entries({}));
    for (const [extension, count] of extensionCounts.entries()) {
        const typ = EXTENSION_TYPE_MAPPING.get(extension);
        if (typ) {
            if (typeCounts.has(typ)) {
                typeCounts.set(typ, typeCounts.get(typ) + count)
            } else {
                typeCounts.set(typ, count)
            }
        } else {
            otherExtensionsCount += count;
        }
    }
    console.log(otherExtensionsCount);

    // Sort these by value
    const sortedCounts = typeCounts.entries().toArray().toSorted(([typ, count]) => -count);
    if (sortedCounts.length == 0 || sortedCounts[0][1] < otherExtensionsCount) {
        return null;
    } else {
        return sortedCounts[0][0]
    }
    // Either there were no reviews, or there were no approvals nor changes requested;
    return null;
}