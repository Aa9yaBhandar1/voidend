import type { ComponentTemplate } from "./types";
import {
    findField,
    buildFetchHook,
    buildInterface,
    buildHtmlFetchScript,
    buildHtmlStyles,
    safeGet,
} from "./codegen-utils";

export const commentItemTemplate: ComponentTemplate = {
    id: "comment-item",
    name: "Comment Item",
    description: "Avatar + author + comment text list. Handles single or list response.",
    requiredFields: ["comment", "author"],
    optionalFields: ["avatar", "createdAt", "id"],
    code: (fields, endpointUrl) => {
        const idField = findField(fields, ["id", "commentid", "uuid"]) ?? "id";
        const authorField =
            findField(fields, ["author", "fullname", "username", "name"]) ?? "author";
        const commentField =
            findField(fields, ["comment", "message", "content", "text"]) ?? "comment";
        const avatarField = findField(fields, ["avatar", "image", "photo"]);
        const createdAtField = findField(fields, ["createdat", "date", "timestamp"]);

        const interfaceLines = [
            `${idField}: string;`,
            `${authorField}: string;`,
            `${commentField}: string;`,
        ];
        if (avatarField) interfaceLines.push(`${avatarField}: string;`);
        if (createdAtField) interfaceLines.push(`${createdAtField}: string;`);

        return `import { useEffect, useState } from "react";

${buildInterface("Comment", interfaceLines)}

${buildFetchHook("CommentItem", endpointUrl, "Comment")}

export function CommentList() {
  const { data, loading, error } = useCommentItemData();

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">Error: {error}</div>;
  if (!data) return null;

  const comments = Array.isArray(data) ? data : [data];

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.${idField}} className="flex gap-3">
${avatarField ? `          <img src={comment.${avatarField}} alt={comment.${authorField}} className="h-8 w-8 rounded-full object-cover" />\n` : ""}          <div className="min-w-0 flex-1 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{comment.${authorField}}</span>
${createdAtField ? `              <span className="text-xs text-gray-400">{comment.${createdAtField}}</span>\n` : ""}            </div>
            <p className="mt-1 text-sm text-gray-600">{comment.${commentField}}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
`;
    },
    htmlCode: (fields, endpointUrl) => {
        const authorField =
            findField(fields, ["author", "fullname", "username", "name"]) ?? "author";
        const commentField =
            findField(fields, ["comment", "message", "content", "text"]) ?? "comment";
        const avatarField = findField(fields, ["avatar", "image", "photo"]);
        const createdAtField = findField(fields, ["createdat", "date", "timestamp"]);

        const avatarHtml = avatarField
            ? `\${${safeGet(avatarField)} ? \`<img class="avatar" style="flex-shrink:0;align-self:flex-start" src="\${${safeGet(avatarField)}}" alt="avatar">\` : \`<div class="avatar-placeholder" style="flex-shrink:0;align-self:flex-start">\${String(${safeGet(authorField)}).charAt(0).toUpperCase() || 'U'}</div>\`}`
            : `<div class="avatar-placeholder" style="flex-shrink:0;align-self:flex-start">\${String(${safeGet(authorField)}).charAt(0).toUpperCase() || 'U'}</div>`;

        const dateHtml = createdAtField
            ? `\${${safeGet(createdAtField)} ? \`<span class="comment-date">\${${safeGet(createdAtField)}}</span>\` : ''}`
            : "";

        const renderFn = `item => \`<div class="comment">
  ${avatarHtml}
  <div class="comment-body">
    <div class="comment-meta">
      <span class="comment-author">\${${safeGet(authorField)}}</span>
      ${dateHtml}
    </div>
    <p class="comment-text">\${${safeGet(commentField)}}</p>
  </div>
</div>\``;

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comments</title>
  <style>
${buildHtmlStyles()}
  </style>
</head>
<body>
  <p id="error"></p>
  <div id="root" class="comment-list"></div>
  <script type="module">
${buildHtmlFetchScript(endpointUrl, renderFn)}
  </script>
</body>
</html>
`;
    },
};
