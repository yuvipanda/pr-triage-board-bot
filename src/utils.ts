import memoize from "memoize";
import fs from "node:fs";
import { join } from "path/posix";

export const getGraphql = memoize((name: string): string => {
    const path = join(import.meta.dirname, "graphql", name);
    return fs.readFileSync(path).toString();
});
