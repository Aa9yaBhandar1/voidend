import type { ComponentTemplate } from "./types";
import {
    findField,
    buildFetchHook,
    buildInterface,
    buildHtmlFetchScript,
    buildHtmlStyles,
    safeGet,
} from "./codegen-utils";

export const productCardTemplate: ComponentTemplate = {
    id: "product-card",
    name: "Product Card",
    description: "Image + product info card. Gracefully handles present/absent images & tags.",
    requiredFields: ["name", "price", "productname", "amount"],
    optionalFields: ["description", "category", "image", "inStock", "rating", "brand", "id"],
    code: (fields, endpointUrl) => {
        const idField = findField(fields, ["id", "productid", "uuid"]) ?? "id";
        const nameField = findField(fields, ["name", "productname", "title"]) ?? "name";
        const priceField = findField(fields, ["price", "amount", "cost"]) ?? "price";
        const imageField = findField(fields, ["image", "photo", "picture", "thumbnail", "cover"]);
        const descriptionField = findField(fields, [
            "description",
            "productdescription",
            "summary",
        ]);
        const categoryField = findField(fields, ["category", "department", "genre"]);
        const brandField = findField(fields, ["brand", "company", "manufacturer"]);
        const inStockField = findField(fields, ["instock", "available", "isinstock"]);
        const ratingField = findField(fields, ["rating", "score", "stars"]);

        const interfaceLines = [
            `${idField}: string;`,
            `${nameField}: string;`,
            `${priceField}: string | number;`,
        ];
        if (imageField) interfaceLines.push(`${imageField}: string;`);
        if (descriptionField) interfaceLines.push(`${descriptionField}: string;`);
        if (categoryField) interfaceLines.push(`${categoryField}: string;`);
        if (brandField) interfaceLines.push(`${brandField}: string;`);
        if (inStockField) interfaceLines.push(`${inStockField}: boolean;`);
        if (ratingField) interfaceLines.push(`${ratingField}: string | number;`);

        return `import { useEffect, useState } from "react";

${buildInterface("Product", interfaceLines)}

${buildFetchHook("ProductCard", endpointUrl, "Product")}

export function ProductCard() {
  const { data, loading, error } = useProductCardData();

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">Error: {error}</div>;
  if (!data) return null;

  const products = Array.isArray(data) ? data : [data];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <div key={product.${idField}} className="flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
          <div>
${
    imageField
        ? `            {product.${imageField} ? (
              <img src={product.${imageField}} alt={product.${nameField}} className="h-44 w-full object-cover" />
            ) : (
              <div className="flex h-36 w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-3xl text-zinc-400">
                📦
              </div>
            )}`
        : `            <div className="flex h-24 w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-3xl text-zinc-400">
              📦
            </div>`
}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
${categoryField ? `                {product.${categoryField} && <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">{product.${categoryField}}</span>}\n` : ""}${brandField ? `                {product.${brandField} && <span className="text-[10px] font-mono text-zinc-400">{product.${brandField}}</span>}\n` : ""}              </div>
              <p className="font-semibold text-base text-zinc-900 dark:text-zinc-100 truncate">{product.${nameField}}</p>
${descriptionField ? `              {product.${descriptionField} && <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{product.${descriptionField}}</p>}\n` : ""}            </div>
          </div>

          <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">\${product.${priceField}}</span>
${ratingField ? `              {product.${ratingField} && <span className="ml-2 text-xs text-amber-500">Rating: {product.${ratingField}}</span>}\n` : ""}            </div>

${
    inStockField
        ? `            {product.${inStockField} !== undefined && (
              <span className={product.${inStockField} ? "px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"}>
                {product.${inStockField} ? "In stock" : "Out of stock"}
              </span>
            )}\n`
        : ""
}          </div>
        </div>
      ))}
    </div>
  );
}
`;
    },
    htmlCode: (fields, endpointUrl) => {
        const nameField = findField(fields, ["name", "productname", "title"]) ?? "name";
        const priceField = findField(fields, ["price", "amount", "cost"]) ?? "price";
        const imageField = findField(fields, ["image", "photo", "picture", "thumbnail", "cover"]);
        const descriptionField = findField(fields, [
            "description",
            "productdescription",
            "summary",
        ]);
        const categoryField = findField(fields, ["category", "department", "genre"]);
        const brandField = findField(fields, ["brand", "company", "manufacturer"]);
        const inStockField = findField(fields, ["instock", "available", "isinstock"]);
        const ratingField = findField(fields, ["rating", "score", "stars"]);

        const imgHtml = imageField
            ? `\${${safeGet(imageField)} ? \`<img class="product-img" src="\${${safeGet(imageField)}}" alt="product">\` : '<div class="product-img-placeholder">📦</div>'}`
            : `<div class="product-img-placeholder">📦</div>`;

        const categoryBadge = categoryField
            ? `\${${safeGet(categoryField)} ? \`<span class="badge badge-zinc">\${${safeGet(categoryField)}}</span>\` : ''}`
            : "";
        const brandSpan = brandField
            ? `\${${safeGet(brandField)} ? \`<span style="font-size:.75rem;color:var(--muted)">\${${safeGet(brandField)}}</span>\` : ''}`
            : "";
        const descSpan = descriptionField
            ? `\${${safeGet(descriptionField)} ? \`<div class="card-desc" style="padding:0 .85rem">\${${safeGet(descriptionField)}}</div>\` : ''}`
            : "";
        const ratingSpan = ratingField
            ? `\${${safeGet(ratingField)} ? \`<span style="font-size:.78rem;color:#f59e0b">★ \${${safeGet(ratingField)}}</span>\` : ''}`
            : "";
        const inStockBadge = inStockField
            ? `\${item[${JSON.stringify(inStockField)}] !== undefined ? \`<span class="badge \${item[${JSON.stringify(inStockField)}] ? 'badge-emerald' : 'badge-rose'}">\${item[${JSON.stringify(inStockField)}] ? 'In stock' : 'Out of stock'}</span>\` : ''}`
            : "";

        const renderFn = `item => \`<div class="card" style="padding:0;overflow:hidden">
  ${imgHtml}
  <div class="product-body">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
      ${categoryBadge}
      ${brandSpan}
    </div>
    <div class="card-title" style="padding:0">\${${safeGet(nameField)}}</div>
    ${descSpan}
  </div>
  <div class="product-footer">
    <div>
      <span class="price">$\${${safeGet(priceField)}}</span>
      ${ratingSpan}
    </div>
    ${inStockBadge}
  </div>
</div>\``;

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Cards</title>
  <style>
${buildHtmlStyles()}
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
