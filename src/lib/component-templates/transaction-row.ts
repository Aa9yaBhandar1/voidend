import type { ComponentTemplate } from "./types";
import { findField, buildFetchHook, buildInterface } from "./codegen-utils";

export const transactionRowTemplate: ComponentTemplate = {
    id: "transaction-row",
    name: "Transaction Statement Table",
    description: "Account statement / financial log table row list adapting to present columns.",
    requiredFields: ["amount", "date", "price"],
    optionalFields: [
        "transactionId",
        "currency",
        "status",
        "description",
        "category",
        "merchant",
        "id",
    ],
    code: (fields, endpointUrl) => {
        const idField = findField(fields, ["id", "transactionid", "uuid"]) ?? "id";
        const amountField = findField(fields, ["amount", "price", "value", "cost"]) ?? "amount";
        const dateField = findField(fields, ["date", "createdat", "timestamp", "time"]) ?? "date";
        const currencyField = findField(fields, ["currency", "currencycode", "symbol"]);
        const statusField = findField(fields, ["status", "state"]);
        const descriptionField = findField(fields, ["description", "note", "title", "details"]);
        const merchantField = findField(fields, ["merchant", "payee", "company", "vendor"]);
        const categoryField = findField(fields, ["category", "type", "department"]);

        const interfaceLines = [
            `${idField}: string;`,
            `${amountField}: string | number;`,
            `${dateField}: string;`,
        ];
        if (currencyField) interfaceLines.push(`${currencyField}: string;`);
        if (statusField) interfaceLines.push(`${statusField}: string;`);
        if (descriptionField) interfaceLines.push(`${descriptionField}: string;`);
        if (merchantField) interfaceLines.push(`${merchantField}: string;`);
        if (categoryField) interfaceLines.push(`${categoryField}: string;`);

        return `import { useEffect, useState } from "react";

${buildInterface("Transaction", interfaceLines)}

${buildFetchHook("TransactionRow", endpointUrl, "Transaction")}

export function TransactionTable() {
  const { data, loading, error } = useTransactionRowData();

  if (loading) return <div className="p-4 text-sm text-gray-500 font-mono">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500 font-mono">Error: {error}</div>;
  if (!data) return null;

  const transactions = Array.isArray(data) ? data : [data];

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-left text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
            <th className="py-3 px-4">Date</th>
${merchantField ? `            <th className="py-3 px-4">Merchant / Payee</th>\n` : ""}${descriptionField ? `            <th className="py-3 px-4">Description</th>\n` : ""}${categoryField ? `            <th className="py-3 px-4">Category</th>\n` : ""}${statusField ? `            <th className="py-3 px-4">Status</th>\n` : ""}            <th className="py-3 px-4 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
          {transactions.map((tx) => (
            <tr key={tx.${idField}} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              <td className="py-3 px-4 text-xs text-zinc-500">{tx.${dateField}}</td>
${merchantField ? `              <td className="py-3 px-4 font-sans font-medium text-zinc-900 dark:text-zinc-100">{tx.${merchantField}}</td>\n` : ""}${descriptionField ? `              <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-400">{tx.${descriptionField}}</td>\n` : ""}${categoryField ? `              <td className="py-3 px-4 text-xs"><span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">{tx.${categoryField}}</span></td>\n` : ""}${
            statusField
                ? `              <td className="py-3 px-4 text-xs">
                {tx.${statusField} && (
                  <span className="px-2 py-0.5 rounded uppercase font-semibold text-[10px] bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {tx.${statusField}}
                  </span>
                )}
              </td>\n`
                : ""
        }              <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                {tx.${amountField}}${currencyField ? ` {tx.${currencyField}}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
    },
};
