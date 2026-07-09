export const FAKER_OPTIONS = [
    { value: "$faker.string.uuid", label: "ID (UUID)" },
    { value: "$faker.person.fullName", label: "Full Name" },
    { value: "$faker.lorem.paragraph", label: "Paragraph" },
    { value: "$faker.date.anytime", label: "Date" },
    { value: "$faker.internet.email", label: "Email" },
    { value: "$faker.phone.number", label: "Phone Number" },
];

export interface SchemaField {
    id: string;
    fieldName: string;
    dataType: string;
}

export function normalizeStoredFieldType(value: unknown): string {
    if (typeof value !== "string") return "$faker.string.uuid";
    if (value.startsWith("$faker.")) return value;

    const legacyTypeMap: Record<string, string> = {
        uuid: "$faker.string.uuid",
        fullName: "$faker.person.fullName",
        paragraph: "$faker.lorem.paragraph",
        date: "$faker.date.anytime",
        email: "$faker.internet.email",
        phoneNumber: "$faker.phone.number",
    };

    return legacyTypeMap[value] ?? "$faker.string.uuid";
}

export function fieldsFromSchema(schema: unknown): SchemaField[] {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
        return [
            {
                id: crypto.randomUUID(),
                fieldName: "",
                dataType: "$faker.string.uuid",
            },
        ];
    }

    const fields = Object.entries(schema).map(([fieldName, dataType]) => ({
        id: crypto.randomUUID(),
        fieldName,
        dataType: normalizeStoredFieldType(dataType),
    }));

    return fields.length > 0
        ? fields
        : [
              {
                  id: crypto.randomUUID(),
                  fieldName: "",
                  dataType: "$faker.string.uuid",
              },
          ];
}

export function buildSchema(schemaFields: SchemaField[]): Record<string, string> {
    const formattedSchema: Record<string, string> = {};
    schemaFields.forEach((field) => {
        if (field.fieldName.trim()) {
            formattedSchema[field.fieldName.trim()] = field.dataType;
        }
    });

    return formattedSchema;
}
