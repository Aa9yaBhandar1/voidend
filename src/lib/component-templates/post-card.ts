import type { ComponentTemplate } from "./types";
import {
    findField,
    buildFetchHook,
    buildInterface,
    buildHtmlFetchScript,
    buildHtmlStyles,
    safeGet,
} from "./codegen-utils";

export const postCardTemplate: ComponentTemplate = {
    id: "post-card",
    name: "Post Card",
    description: "Cover image + title + excerpt list. Handles single or list response.",
    requiredFields: ["title", "content"],
    optionalFields: ["author", "coverImage", "publishedAt", "tags", "id"],
    code: (fields, endpointUrl) => {
        const idField = findField(fields, ["id", "postid", "uuid"]) ?? "id";
        const titleField = findField(fields, ["title"]) ?? "title";
        const contentField = findField(fields, ["content", "body", "paragraph"]) ?? "content";
        const authorField = findField(fields, ["author", "fullname", "username"]);
        const coverImageField = findField(fields, ["coverimage", "image", "thumbnail"]);
        const publishedAtField = findField(fields, ["publishedat", "createdat", "date"]);

        const interfaceLines = [
            `${idField}: string;`,
            `${titleField}: string;`,
            `${contentField}: string;`,
        ];
        if (authorField) interfaceLines.push(`${authorField}: string;`);
        if (coverImageField) interfaceLines.push(`${coverImageField}: string;`);
        if (publishedAtField) interfaceLines.push(`${publishedAtField}: string;`);

        return `import { useEffect, useState } from "react";

${buildInterface("Post", interfaceLines)}

${buildFetchHook("PostCard", endpointUrl, "Post")}

export function PostCard() {
  const { data, loading, error } = usePostCardData();

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">Error: {error}</div>;
  if (!data) return null;

  const posts = Array.isArray(data) ? data : [data];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {posts.map((post) => (
        <article key={post.${idField}} className="overflow-hidden rounded-lg border">
${coverImageField ? `          <img src={post.${coverImageField}} alt={post.${titleField}} className="h-40 w-full object-cover" />\n` : ""}          <div className="p-4">
            <h3 className="font-semibold">{post.${titleField}}</h3>
            <p className="mt-1 line-clamp-3 text-sm text-gray-500">{post.${contentField}}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
${authorField ? `              <span>{post.${authorField}}</span>\n` : ""}${publishedAtField ? `              <span>{post.${publishedAtField}}</span>\n` : ""}            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
`;
    },
    htmlCode: (fields, endpointUrl) => {
        const titleField = findField(fields, ["title"]) ?? "title";
        const contentField = findField(fields, ["content", "body", "paragraph"]) ?? "content";
        const authorField = findField(fields, ["author", "fullname", "username"]);
        const coverImageField = findField(fields, ["coverimage", "image", "thumbnail"]);
        const publishedAtField = findField(fields, ["publishedat", "createdat", "date"]);

        const coverHtml = coverImageField
            ? `\${${safeGet(coverImageField)} ? \`<img class="cover" src="\${${safeGet(coverImageField)}}" alt="cover">\` : ''}`
            : "";
        const authorHtml = authorField
            ? `\${${safeGet(authorField)} ? \`<span>\${${safeGet(authorField)}}</span>\` : ''}`
            : "";
        const dateHtml = publishedAtField
            ? `\${${safeGet(publishedAtField)} ? \`<span>\${${safeGet(publishedAtField)}}</span>\` : ''}`
            : "";

        const renderFn = `item => \`<article class="article">
  ${coverHtml}
  <div class="article-body">
    <div class="article-title">\${${safeGet(titleField)}}</div>
    <div class="article-excerpt">\${${safeGet(contentField)}}</div>
    <div class="article-footer">${authorHtml}${dateHtml}</div>
  </div>
</article>\``;

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Post Cards</title>
  <style>
${buildHtmlStyles()}
  .grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  </style>
</head>
<body>
  <p id="error"></p>
  <div id="root" class="grid"></div>
  <script type="module">
${buildHtmlFetchScript(endpointUrl, renderFn)}
  </script>
</body>
</html>
`;
    },
};
