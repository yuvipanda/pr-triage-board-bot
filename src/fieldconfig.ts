export type FieldDataType = "TEXT" | "NUMBER" | "DATE" | "SINGLE_SELECT";

// Define the possible values for each field
export type AuthorKindValue = "Bot" | "Maintainer" | "First Time Contributor" | "Early Contributor" | "Seasoned Contributor";
export type MaintainerEngagementValue = "No Maintainer Engagement" | "Single Maintainer Engagement" | "Multiple Maintainer Engagement";
export type CIStatusValue = "Tests Passing" | "Tests Failing";
export type MergeConflictsValue = "Merge Conflicts" | "No Merge Conflicts";
export type ApprovalStatusValue = "Changes Requested" | "Maintainer Approved";

export interface FieldSpec {
    name: string;
    dataType: FieldDataType;
    options?: string[];
}

export const REQUIRED_FIELDS: FieldSpec[] = [
    {
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
    {
        name: "Opened At",
        dataType: "DATE"
    },
    {
        name: "Total Lines Changed",
        dataType: "NUMBER"
    },
    {
        name: "Maintainer Engagement",
        dataType: "SINGLE_SELECT",
        options: [
            "No Maintainer Engagement",
            "Single Maintainer Engagement",
            "Multiple Maintainer Engagement"
        ]
    },
    {
        name: "CI Status",
        dataType: "SINGLE_SELECT",
        options: [
            "Tests Passing",
            "Tests Failing"
        ]
    },
    {
        name: "Merge Conflicts",
        dataType: "SINGLE_SELECT",
        options: [
            "Merge Conflicts",
            "No Merge Conflicts"
        ]
    },
    {
        name: "Approval Status",
        dataType: "SINGLE_SELECT",
        options: [
            "Changes Requested",
            "Maintainer Approved"
        ]
    }
];