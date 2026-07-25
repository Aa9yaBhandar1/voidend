import type { ComponentTemplate } from "./types";
import {
    findField,
    buildFetchHook,
    buildInterface,
    buildHtmlFetchScript,
    buildHtmlStyles,
    safeGet,
} from "./codegen-utils";

export const todoListTemplate: ComponentTemplate = {
    id: "todo-list",
    name: "Todo List",
    description: "Checkbox list adaptively rendering title, status, priority, dates & tags.",
    requiredFields: ["title", "completed", "task", "done"],
    optionalFields: ["dueDate", "priority", "category", "description", "assignee", "id"],
    code: (fields, endpointUrl) => {
        const idField = findField(fields, ["id", "todoid", "uuid"]) ?? "id";
        const titleField = findField(fields, ["title", "task", "name", "summary"]) ?? "title";
        const completedField =
            findField(fields, ["completed", "done", "isdone", "iscompleted"]) ?? "completed";
        const dueDateField = findField(fields, ["duedate", "deadline", "date", "due"]);
        const priorityField = findField(fields, ["priority", "level", "urgency"]);
        const categoryField = findField(fields, ["category", "tag", "project", "label"]);
        const assigneeField = findField(fields, ["assignee", "assignedto", "user", "owner"]);
        const descriptionField = findField(fields, ["description", "details", "notes"]);

        const interfaceLines = [
            `${idField}: string;`,
            `${titleField}: string;`,
            `${completedField}: boolean;`,
        ];
        if (dueDateField) interfaceLines.push(`${dueDateField}: string;`);
        if (priorityField) interfaceLines.push(`${priorityField}: string;`);
        if (categoryField) interfaceLines.push(`${categoryField}: string;`);
        if (assigneeField) interfaceLines.push(`${assigneeField}: string;`);
        if (descriptionField) interfaceLines.push(`${descriptionField}: string;`);

        return `import { useEffect, useState } from "react";

${buildInterface("Todo", interfaceLines)}

${buildFetchHook("TodoList", endpointUrl, "Todo")}

export function TodoList() {
  const { data, loading, error } = useTodoListData();

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">Error: {error}</div>;
  if (!data) return null;

  const todos = Array.isArray(data) ? data : [data];

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {todos.map((todo) => (
        <li key={todo.${idField}} className="flex flex-col gap-2 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(todo.${completedField})}
              readOnly
              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer"
            />
            <span className={todo.${completedField} ? "flex-1 font-medium text-zinc-400 line-through text-sm" : "flex-1 font-medium text-zinc-900 dark:text-zinc-100 text-sm"}>
              {todo.${titleField}}
            </span>
${priorityField ? `            {todo.${priorityField} && <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{todo.${priorityField}}</span>}\n` : ""}${categoryField ? `            {todo.${categoryField} && <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">{todo.${categoryField}}</span>}\n` : ""}          </div>

${
    descriptionField
        ? `          {todo.${descriptionField} && (
            <p className="ml-7 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{todo.${descriptionField}}</p>
          )}\n`
        : ""
}${
            dueDateField || assigneeField
                ? `          <div className="ml-7 flex items-center gap-4 text-xs text-zinc-400">
${dueDateField ? `            {todo.${dueDateField} && <span>Due: {todo.${dueDateField}}</span>}\n` : ""}${assigneeField ? `            {todo.${assigneeField} && <span>Assignee: {todo.${assigneeField}}</span>}\n` : ""}          </div>\n`
                : ""
        }        </li>
      ))}
    </ul>
  );
}
`;
    },
    htmlCode: (fields, endpointUrl) => {
        const titleField = findField(fields, ["title", "task", "name", "summary"]) ?? "title";
        const completedField =
            findField(fields, ["completed", "done", "isdone", "iscompleted"]) ?? "completed";
        const dueDateField = findField(fields, ["duedate", "deadline", "date", "due"]);
        const priorityField = findField(fields, ["priority", "level", "urgency"]);
        const categoryField = findField(fields, ["category", "tag", "project", "label"]);
        const descriptionField = findField(fields, ["description", "details", "notes"]);
        const assigneeField = findField(fields, ["assignee", "assignedto", "user", "owner"]);

        const priorityBadge = priorityField
            ? `\${${safeGet(priorityField)} ? \`<span class="badge badge-amber">\${${safeGet(priorityField)}}</span>\` : ''}`
            : "";
        const categoryBadge = categoryField
            ? `\${${safeGet(categoryField)} ? \`<span class="badge badge-zinc">\${${safeGet(categoryField)}}</span>\` : ''}`
            : "";
        const descHtml = descriptionField
            ? `\${${safeGet(descriptionField)} ? \`<div style="margin-left:1.6rem;font-size:.78rem;color:var(--muted)">\${${safeGet(descriptionField)}}</div>\` : ''}`
            : "";
        const dueDateHtml = dueDateField
            ? `\${${safeGet(dueDateField)} ? \`<span style="font-size:.72rem;color:var(--muted)">Due: \${${safeGet(dueDateField)}}</span>\` : ''}`
            : "";
        const assigneeHtml = assigneeField
            ? `\${${safeGet(assigneeField)} ? \`<span style="font-size:.72rem;color:var(--muted)">Assignee: \${${safeGet(assigneeField)}}</span>\` : ''}`
            : "";

        const renderFn = `item => \`<li class="todo-item">
  <div class="todo-row">
    <input type="checkbox" \${item[${JSON.stringify(completedField)}] ? 'checked' : ''} onclick="return false" style="width:16px;height:16px;flex-shrink:0">
    <span class="todo-title \${item[${JSON.stringify(completedField)}] ? 'done' : ''}">\${${safeGet(titleField)}}</span>
    ${priorityBadge}
    ${categoryBadge}
  </div>
  ${descHtml}
  <div style="margin-left:1.6rem;display:flex;gap:.75rem">${dueDateHtml}${assigneeHtml}</div>
</li>\``;

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo List</title>
  <style>
${buildHtmlStyles()}
  </style>
</head>
<body>
  <p id="error"></p>
  <ul id="root" class="todo-list"></ul>
  <script type="module">
${buildHtmlFetchScript(endpointUrl, renderFn)}
  </script>
</body>
</html>
`;
    },
};
