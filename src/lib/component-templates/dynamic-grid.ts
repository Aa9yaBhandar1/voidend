import type { ComponentTemplate } from "./types";
import { buildFetchHook, buildInterface } from "./codegen-utils";

function mapDataTypeToTsType(dataType: string): string {
    const dt = dataType.toLowerCase();
    if (dt.includes("boolean") || dt.includes("datatype.boolean")) {
        return "boolean";
    }
    if (
        dt.includes("number.int") ||
        dt.includes("number.float") ||
        dt.includes("number.bigint") ||
        dt.includes("number.hex") ||
        dt.includes("commerce.price") ||
        dt.includes("finance.amount") ||
        dt.includes("location.latitude") ||
        dt.includes("location.longitude")
    ) {
        return "number";
    }
    return "string";
}

function normalize(s: string): string {
    return s.toLowerCase().replace(/[_\s-]/g, "");
}

function renderPropAccess(path: string | undefined): string {
    if (!path) return "undefined";
    if (path.includes(".")) {
        return `item?.["${path}"]`;
    }
    return `item.${path}`;
}

export const dynamicGridTemplate: ComponentTemplate = {
    id: "dynamic-grid",
    name: "Dynamic Card Grid",
    description: "Adaptive UI card generated directly from schema fields and Faker types.",
    requiredFields: [],
    optionalFields: [],
    code: (fields, endpointUrl) => {
        const validFields = fields.filter((f) => f.fieldName.trim().length > 0);

        const idField =
            validFields.find((f) => {
                const norm = normalize(f.fieldName);
                const dt = normalize(f.dataType);
                return (
                    norm === "id" ||
                    norm.includes("uuid") ||
                    norm.endsWith("id") ||
                    dt.includes("uuid") ||
                    dt.includes("nanoid")
                );
            })?.fieldName ??
            validFields[0]?.fieldName ??
            "id";

        const titleField = validFields.find((f) => {
            const norm = normalize(f.fieldName);
            const dt = normalize(f.dataType);
            return (
                norm.includes("name") ||
                norm.includes("title") ||
                norm.includes("label") ||
                norm.includes("username") ||
                norm.includes("user") ||
                norm.includes("product") ||
                norm.includes("dish") ||
                norm.includes("vehicle") ||
                dt.includes("fullname") ||
                dt.includes("firstname") ||
                dt.includes("lastname") ||
                dt.includes("username") ||
                dt.includes("productname") ||
                dt.includes("company.name") ||
                dt.includes("book.title") ||
                dt.includes("food.dish") ||
                dt.includes("vehicle.vehicle")
            );
        })?.fieldName;

        const subtitleField = validFields.find((f) => {
            const norm = normalize(f.fieldName);
            const dt = normalize(f.dataType);
            return (
                f.fieldName !== titleField &&
                (norm.includes("username") ||
                    norm.includes("user") ||
                    norm.includes("role") ||
                    norm.includes("job") ||
                    norm.includes("category") ||
                    norm.includes("department") ||
                    norm.includes("status") ||
                    norm.includes("author") ||
                    dt.includes("username") ||
                    dt.includes("jobtitle") ||
                    dt.includes("email") ||
                    dt.includes("domainname") ||
                    dt.includes("department") ||
                    dt.includes("book.author") ||
                    dt.includes("vehicle.manufacturer"))
            );
        })?.fieldName;

        const avatarField = validFields.find((f) => {
            const norm = normalize(f.fieldName);
            const dt = normalize(f.dataType);
            return (
                norm.includes("avatar") ||
                norm.includes("image") ||
                norm.includes("photo") ||
                norm.includes("picture") ||
                norm.includes("cover") ||
                dt.includes("image.avatar") ||
                dt.includes("image.url") ||
                dt.includes("image.datauri")
            );
        })?.fieldName;

        const descriptionField = validFields.find((f) => {
            const norm = normalize(f.fieldName);
            const dt = normalize(f.dataType);
            return (
                f.fieldName !== titleField &&
                f.fieldName !== subtitleField &&
                (norm.includes("bio") ||
                    norm.includes("description") ||
                    norm.includes("comment") ||
                    norm.includes("summary") ||
                    norm.includes("catchphrase") ||
                    dt.includes("person.bio") ||
                    dt.includes("lorem.paragraph") ||
                    dt.includes("lorem.paragraphs") ||
                    dt.includes("lorem.sentence") ||
                    dt.includes("commerce.productdescription") ||
                    dt.includes("company.catchphrase"))
            );
        })?.fieldName;

        const detailFields = validFields.filter(
            (f) =>
                f.fieldName !== idField &&
                f.fieldName !== titleField &&
                f.fieldName !== subtitleField &&
                f.fieldName !== avatarField &&
                f.fieldName !== descriptionField,
        );

        const interfaceLines = validFields.map((f) => {
            if (f.fieldName.includes(".")) {
                return `"${f.fieldName}"?: ${mapDataTypeToTsType(f.dataType)};`;
            }
            return `${f.fieldName}: ${mapDataTypeToTsType(f.dataType)};`;
        });

        return `import { useEffect, useState } from "react";

${buildInterface("DataItem", interfaceLines)}

${buildFetchHook("DataItem", endpointUrl, "DataItem")}

export function DataCardList() {
  const { data, loading, error } = useDataItemData();

  if (loading) return <div className="p-4 text-sm text-zinc-500 font-mono">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-rose-500 font-mono">Error: {error}</div>;
  if (!data) return null;

  const items = Array.isArray(data) ? data : [data];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 font-sans">
      {items.map((item, idx) => (
        <div
          key={String(${renderPropAccess(idField)} ?? idx)}
          className="flex flex-col justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
${
    avatarField
        ? `              {${renderPropAccess(avatarField)} ? (
                <img
                  src={String(${renderPropAccess(avatarField)})}
                  alt="Avatar"
                  className="h-11 w-11 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-xs"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-600 dark:text-zinc-300 shrink-0 border border-zinc-200/50 dark:border-zinc-700/50">
                  {${titleField ? `String(${renderPropAccess(titleField)} ?? "").charAt(0).toUpperCase() || ` : ""} "#"}
                </div>
              )}`
        : `              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-600 dark:text-zinc-300 shrink-0 border border-zinc-200/50 dark:border-zinc-700/50">
                {${titleField ? `String(${renderPropAccess(titleField)} ?? "").charAt(0).toUpperCase() || ` : ""} "D"}
              </div>`
}
              <div className="min-w-0 flex-1">
${
    titleField
        ? `                <h4 className="truncate font-semibold text-sm text-zinc-900 dark:text-zinc-100">{${renderPropAccess(titleField)}}</h4>\n`
        : `                <h4 className="truncate font-semibold text-sm text-zinc-900 dark:text-zinc-100">Item #{idx + 1}</h4>\n`
}${subtitleField ? `                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{${renderPropAccess(subtitleField)}}</p>\n` : ""}              </div>
            </div>

${descriptionField ? `            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-2">{${renderPropAccess(descriptionField)}}</p>\n` : ""}          </div>

${
    detailFields.length > 0
        ? `          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs space-y-1.5">
${detailFields
    .map((f) => {
        const propAccess = renderPropAccess(f.fieldName);
        return `            {${propAccess} !== undefined && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-zinc-400 font-mono text-[11px] font-medium">${f.fieldName}:</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate text-[11px]">{String(${propAccess})}</span>
              </div>
            )}`;
    })
    .join("\n")}
          </div>\n`
        : ""
}        </div>
      ))}
    </div>
  );
}
`;
    },
};
