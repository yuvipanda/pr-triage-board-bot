import { Octokit } from "@octokit/core";
import { paginateGraphQLInterface } from "@octokit/plugin-paginate-graphql";
import { getGraphql } from "./utils.js";
import memoize from "memoize";

export interface Field {
    id: string
    name: string
}

export class SingleSelectOption {
    id: string
    name: string

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }
}

export class SingleSelectField implements Field {

    id: string
    name: string
    options: SingleSelectOption[];

    constructor(id: string, name: string, options: SingleSelectOption[]) {
        this.id = id;
        this.name = name;
        this.options = options;
    }

    findOption = memoize((name: string): SingleSelectOption => {
        for (const option of this.options) {
            if (option.name === name) {
                return option
            }
        }
        throw "Learn how to error handle this properly? Or express this via types?";
    })
}

export class Project {
    id: string;
    fields: Field[];
    octokit: Octokit & paginateGraphQLInterface;
    organization: string;
    number: number;

    constructor(id: string, fields: Field[], octokit: Octokit & paginateGraphQLInterface, organization: string, number: number) {
        this.id = id;
        this.fields = fields;
        this.octokit = octokit;
        this.organization = organization;
        this.number = number;
    };

    static getProject = async (organization: string, number: number, octokit: Octokit & paginateGraphQLInterface): Promise<Project> => {
        const query = getGraphql("project.gql");
        const resp: any = await octokit.graphql(query, { organization: organization, number: number });
        const fields = resp.organization.projectV2.fields.nodes.map(i => {
            if (i['options']) {
                return new SingleSelectField(i.id, i.name, i.options.map(i => new SingleSelectOption(i.id, i.name)))
            } else {
                return { id: i.id, name: i.name };
            }
        });
        return new Project(
            resp.organization.projectV2.id,
            fields,
            octokit,
            organization,
            number
        );
    }

    findField = memoize((name: string): Field => {
        for (const field of this.fields) {
            if (field.name === name) {
                return field
            }
        }
        throw "Learn how to error handle this properly? Or express this via types?";
    });

    setItemValue = async (projectItemId: string, fieldName: string, value: Date | string | number | null) => {
        const field = this.findField(fieldName);

        // I am creating a query via string interpolation
        // may i rot in hell
        let valueDefinition = "";
        let valueProperty;
        let mutationName;
        if (value !== null) {
            let valueMutation;
            if (value instanceof Date) {
                valueDefinition = "$value: Date!"
                valueMutation = "date: $value"
            } else if (typeof value === "string") {
                if (field instanceof SingleSelectField) {
                    valueDefinition = "$value: String!";
                    valueMutation = "singleSelectOptionId: $value";
                    value = field.findOption(value).id;
                } else {
                    valueDefinition = "$value: String!";
                    valueMutation = "string: $value"
                }
            } else if (typeof value === "number") {
                valueDefinition = "$value: Float!";
                valueMutation = "number: $value"
            }
            valueProperty = `
                value: {
                    ${valueMutation}
                }
            `
            mutationName = 'updateProjectV2ItemFieldValue';
        } else {
            mutationName = 'clearProjectV2ItemFieldValue';
            valueProperty = '';
        }
        const query = `
      mutation($projectId: ID! $itemId: ID! $fieldId: ID! ${valueDefinition}) {
    ${mutationName}(
      input: {
        projectId:$projectId
        itemId:$itemId
        fieldId:$fieldId
        ${valueProperty}
      }
    ) {
      projectV2Item {
        id
      }
    }
  }
    `;

        const resp = await this.octokit.graphql(query, { projectId: this.id, itemId: projectItemId, fieldId: field.id, value: value });
        return resp;
    }

    addContent = async (contentId: string) => {
        const query = `
  mutation ($projectId: ID! $contentId: ID!) {
    addProjectV2ItemById(input: {projectId:$projectId contentId:$contentId}) {
      item {
        id
      }
    }
  }
    `
        const resp: any = await this.octokit.graphql(query, { projectId: this.id, contentId: contentId })
        return resp.addProjectV2ItemById.item.id;
    }

    getExistingItems = async () => {
        const query = getGraphql("projectitems.gql");
        const resp = await this.octokit.graphql.paginate(query, { 
            organization: this.organization, 
            number: this.number 
        });
        return resp.organization.projectV2.items.nodes;
    }

    deleteItem = async (itemId: string) => {
        const query = `
  mutation ($projectId: ID! $itemId: ID!) {
    deleteProjectV2Item(input: {projectId: $projectId itemId: $itemId}) {
      deletedItemId
    }
  }
    `
        const resp: any = await this.octokit.graphql(query, { projectId: this.id, itemId: itemId });
        return resp.deleteProjectV2Item.deletedItemId;
    }

}

