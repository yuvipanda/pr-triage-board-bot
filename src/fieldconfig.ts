export type FieldDataType = "TEXT" | "NUMBER" | "DATE" | "SINGLE_SELECT";

export interface FieldSpec {
    name: string;
    dataType: FieldDataType;
    options?: readonly string[];
}

// Define field configurations as a dictionary with const assertions for type inference
export const REQUIRED_FIELDS = {
    "Author Kind": {
        name: "Author Kind",
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
        name: "Opened At",
        dataType: "DATE"
    },
    "Total Lines Changed": {
        name: "Total Lines Changed",
        dataType: "NUMBER"
    },
    "Maintainer Engagement": {
        name: "Maintainer Engagement",
        dataType: "SINGLE_SELECT",
        options: [
            "No Maintainer Engagement",
            "Single Maintainer Engagement",
            "Multiple Maintainer Engagement"
        ]
    },
    "CI Status": {
        name: "CI Status",
        dataType: "SINGLE_SELECT",
        options: [
            "Tests Passing",
            "Tests Failing"
        ]
    },
    "Merge Conflicts": {
        name: "Merge Conflicts",
        dataType: "SINGLE_SELECT",
        options: [
            "Merge Conflicts",
            "No Merge Conflicts"
        ]
    },
    "Approval Status": {
        name: "Approval Status",
        dataType: "SINGLE_SELECT",
        options: [
            "Changes Requested",
            "Maintainer Approved"
        ]
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
export type AuthorKindValue = ExtractFieldValueType<typeof REQUIRED_FIELDS["Author Kind"]>;
export type OpenedAtValue = ExtractFieldValueType<typeof REQUIRED_FIELDS["Opened At"]>;
export type TotalLinesChangedValue = ExtractFieldValueType<typeof REQUIRED_FIELDS["Total Lines Changed"]>;
export type MaintainerEngagementValue = ExtractFieldValueType<typeof REQUIRED_FIELDS["Maintainer Engagement"]>;
export type CIStatusValue = ExtractFieldValueType<typeof REQUIRED_FIELDS["CI Status"]>;
export type MergeConflictsValue = ExtractFieldValueType<typeof REQUIRED_FIELDS["Merge Conflicts"]>;
export type ApprovalStatusValue = ExtractFieldValueType<typeof REQUIRED_FIELDS["Approval Status"]>;