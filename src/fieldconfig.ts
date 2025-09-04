export type FieldDataType = "TEXT" | "NUMBER" | "DATE" | "SINGLE_SELECT";

export interface FieldOptionSpec {
    name: string;
}

export interface FieldSpec {
    name: string;
    dataType: FieldDataType;
    options?: FieldOptionSpec[];
}

export const REQUIRED_FIELDS: FieldSpec[] = [
    {
        name: "Author Kind",
        dataType: "SINGLE_SELECT",
        options: [
            { name: "Bot" },
            { name: "Maintainer" },
            { name: "First Time Contributor" },
            { name: "Early Contributor" },
            { name: "Seasoned Contributor" }
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
            { name: "No Maintainer Engagement" },
            { name: "Single Maintainer Engagement" },
            { name: "Multiple Maintainer Engagement" }
        ]
    },
    {
        name: "CI Status",
        dataType: "SINGLE_SELECT",
        options: [
            { name: "Tests Passing" },
            { name: "Tests Failing" }
        ]
    },
    {
        name: "Merge Conflicts",
        dataType: "SINGLE_SELECT",
        options: [
            { name: "Merge Conflicts" },
            { name: "No Merge Conflicts" }
        ]
    },
    {
        name: "Approval Status",
        dataType: "SINGLE_SELECT",
        options: [
            { name: "Changes Requested" },
            { name: "Maintainer Approved" }
        ]
    }
];