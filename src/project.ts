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

    findOption(name: string): SingleSelectOption {
        for (const option of this.options) {
            if (option.name === name) {
                return option
            }
        }
        throw "Learn how to error handle this properly? Or express this via types?";
    }
}

export class Project {
    id: string;
    fields: Field[];

    constructor(id: string, fields: Field[]) {
        this.id = id;
        this.fields = fields;
    };

    findField(name: string): Field {
        for (const field of this.fields) {
            if (field.name === name) {
                return field
            }
        }
        throw "Learn how to error handle this properly? Or express this via types?";
    }

}

