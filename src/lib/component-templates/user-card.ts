import type { ComponentTemplate } from "./types";
import { findField, buildFetchHook, buildInterface } from "./codegen-utils";

export const userCardTemplate: ComponentTemplate = {
    id: "user-card",
    name: "User Card",
    description: "Avatar + profile details grid. Adapts to present fields.",
    requiredFields: ["username", "fullName", "name"],
    optionalFields: ["email", "jobTitle", "phone", "bio", "avatar", "id"],
    code: (fields, endpointUrl) => {
        const idField = findField(fields, ["id", "userid", "uuid"]) ?? "id";
        const usernameField = findField(fields, ["username", "handle"]);
        const fullNameField = findField(fields, ["fullname", "name", "displayname"]) ?? "name";
        const avatarField = findField(fields, ["avatar", "image", "photo", "picture"]);
        const emailField = findField(fields, ["email"]);
        const jobTitleField = findField(fields, ["jobtitle", "role", "title"]);
        const phoneField = findField(fields, ["phone", "phonenumber", "mobile", "cell"]);
        const bioField = findField(fields, ["bio", "about", "description"]);

        const interfaceLines = [`${idField}: string;`, `${fullNameField}: string;`];
        if (usernameField) interfaceLines.push(`${usernameField}: string;`);
        if (avatarField) interfaceLines.push(`${avatarField}: string;`);
        if (emailField) interfaceLines.push(`${emailField}: string;`);
        if (jobTitleField) interfaceLines.push(`${jobTitleField}: string;`);
        if (phoneField) interfaceLines.push(`${phoneField}: string;`);
        if (bioField) interfaceLines.push(`${bioField}: string;`);

        return `import { useEffect, useState } from "react";

${buildInterface("User", interfaceLines)}

${buildFetchHook("UserCard", endpointUrl, "User")}

export function UserCard() {
  const { data, loading, error } = useUserCardData();

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">Error: {error}</div>;
  if (!data) return null;

  const users = Array.isArray(data) ? data : [data];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <div key={user.${idField}} className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
${
    avatarField
        ? `            <img
              src={user.${avatarField}}
              alt={user.${fullNameField}}
              className="h-12 w-12 rounded-full object-cover shrink-0"
            />`
        : `            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 font-semibold text-zinc-600 dark:text-zinc-200 shrink-0">
              {user.${fullNameField}?.charAt(0) || "U"}
            </div>`
}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-base">{user.${fullNameField}}</p>
${usernameField ? `              <p className="truncate text-sm text-gray-500">@{user.${usernameField}}</p>\n` : ""}${jobTitleField ? `              <p className="truncate text-xs text-gray-400">{user.${jobTitleField}}</p>\n` : ""}            </div>
          </div>
${bioField ? `          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{user.${bioField}}</p>\n` : ""}${
            emailField || phoneField
                ? `          <div className="pt-2 border-t text-xs text-gray-500 space-y-1">
${emailField ? `            {user.${emailField} && <p className="truncate">Email: {user.${emailField}}</p>}\n` : ""}${phoneField ? `            {user.${phoneField} && <p className="truncate">Phone: {user.${phoneField}}</p>}\n` : ""}          </div>\n`
                : ""
        }        </div>
      ))}
    </div>
  );
}
`;
    },
};
