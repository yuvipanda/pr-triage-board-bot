import { getAuthorKind } from './fields/authorkind.js';
import { getOpenedAt } from './fields/openedat.js';
import { getTotalLinesChanged } from './fields/totallineschanged.js';
import { getMaintainerEngagement } from './fields/maintainerengagement.js';
import { getCIStatus } from './fields/cistatus.js';
import { getMergeConflicts } from './fields/mergeconflicts.js'
import { getApprovalStatus } from './fields/approvalstatus.js';
import type { PaginatedOctokit } from './utils.js';

export type FieldDataType = "TEXT" | "NUMBER" | "DATE" | "SINGLE_SELECT";

export interface FieldConfig {
    dataType: FieldDataType;
    options?: readonly string[];
}

// Define field type configurations first
export const FIELD_CONFIGS = {
    "Author Kind": {
        dataType: "SINGLE_SELECT",
        options: [
            "Bot",
            "Maintainer", 
            "First Time Contributor",
            "Early Contributor",
            "Seasoned Contributor"
        ]
    },
    "Opened At": {
        dataType: "DATE"
    },
    "Total Lines Changed": {
        dataType: "NUMBER"
    },
    "Maintainer Engagement": {
        dataType: "SINGLE_SELECT",
        options: [
            "No Maintainer Engagement",
            "Single Maintainer Engagement",
            "Multiple Maintainer Engagement"
        ]
    },
    "CI Status": {
        dataType: "SINGLE_SELECT",
        options: [
            "Tests Passing",
            "Tests Failing"
        ]
    },
    "Merge Conflicts": {
        dataType: "SINGLE_SELECT",
        options: [
            "Merge Conflicts",
            "No Merge Conflicts"
        ]
    },
    "Approval Status": {
        dataType: "SINGLE_SELECT",
        options: [
            "Changes Requested",
            "Maintainer Approved"
        ]
    }
} as const satisfies Record<string, FieldConfig>;


// Helper type to extract the correct return type from field config
type ExtractFieldValueType<T extends FieldConfig> = T extends { dataType: "SINGLE_SELECT" }
  ? T extends { options: readonly (infer U)[] } ? U : never
  : T extends { dataType: "DATE" }
  ? Date
  : T extends { dataType: "NUMBER" }
  ? number
  : T extends { dataType: "TEXT" }
  ? string
  : never;

export type FieldSpec<T extends FieldConfig = FieldConfig> = {
    dataType: T['dataType'];
    getValue: (octokit: PaginatedOctokit, pr: any) => Promise<ExtractFieldValueType<T>>;
} & (T extends { options: any } ? { options: T['options'] } : { options?: undefined })

// Mapped type to ensure REQUIRED_FIELDS matches FIELD_CONFIGS structure
type RequiredFieldsType = {
    [K in keyof typeof FIELD_CONFIGS]: FieldSpec<typeof FIELD_CONFIGS[K]>
}

// Now add the getValue functions with proper typing
export const REQUIRED_FIELDS: RequiredFieldsType = {
    "Author Kind": {
        ...FIELD_CONFIGS["Author Kind"],
        getValue: getAuthorKind
    },
    "Opened At": {
        ...FIELD_CONFIGS["Opened At"],
        getValue: getOpenedAt
    },
    "Total Lines Changed": {
        ...FIELD_CONFIGS["Total Lines Changed"],
        getValue: getTotalLinesChanged
    },
    "Maintainer Engagement": {
        ...FIELD_CONFIGS["Maintainer Engagement"],
        getValue: getMaintainerEngagement
    },
    "CI Status": {
        ...FIELD_CONFIGS["CI Status"],
        getValue: getCIStatus
    },
    "Merge Conflicts": {
        ...FIELD_CONFIGS["Merge Conflicts"],
        getValue: getMergeConflicts
    },
    "Approval Status": {
        ...FIELD_CONFIGS["Approval Status"],
        getValue: getApprovalStatus
    }
};
