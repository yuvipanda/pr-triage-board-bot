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

export interface FieldSpec extends FieldConfig {
    getValue: (octokit: PaginatedOctokit, pr: any) => Promise<unknown>;
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

// Now add the getValue functions
export const REQUIRED_FIELDS = {
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
} as const satisfies Record<string, FieldSpec>;

// Helper types to extract field value types from configurations
type ExtractOptions<T> = T extends { options: readonly (infer U)[] } ? U : never;

type ExtractFieldValueType<T> = T extends { dataType: "SINGLE_SELECT" }
  ? ExtractOptions<T>
  : T extends { dataType: "DATE" }
  ? Date
  : T extends { dataType: "NUMBER" }
  ? number
  : T extends { dataType: "TEXT" }
  ? string
  : never;

// Generate types from the field configurations using keys
export type AuthorKindValue = ExtractFieldValueType<typeof FIELD_CONFIGS["Author Kind"]>;
export type OpenedAtValue = ExtractFieldValueType<typeof FIELD_CONFIGS["Opened At"]>;
export type TotalLinesChangedValue = ExtractFieldValueType<typeof FIELD_CONFIGS["Total Lines Changed"]>;
export type MaintainerEngagementValue = ExtractFieldValueType<typeof FIELD_CONFIGS["Maintainer Engagement"]>;
export type CIStatusValue = ExtractFieldValueType<typeof FIELD_CONFIGS["CI Status"]>;
export type MergeConflictsValue = ExtractFieldValueType<typeof FIELD_CONFIGS["Merge Conflicts"]>;
export type ApprovalStatusValue = ExtractFieldValueType<typeof FIELD_CONFIGS["Approval Status"]>;