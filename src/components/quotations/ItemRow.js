"use client";

import { Trash2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { AVAILABILITY_OPTIONS } from "@/lib/constants/quotationOptions";
import { computeLineTotal, formatCurrency } from "@/lib/utils/formatters";

export default function ItemRow({ index, row, errors, onChange, onRemove, canRemove }) {
  const lineTotal = computeLineTotal(row);

  return (
    <div className="group relative rounded-lg border border-ink-100 bg-surface-sunken/40 p-4 transition-colors hover:border-accent-200 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-accent-600">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-50 text-accent-600">
            {String(index + 1).padStart(2, "0")}
          </span>
          Item {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-ink-700">
            {formatCurrency(lineTotal)}
          </span>
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            disabled={!canRemove}
            className="rounded-md p-1.5 text-ink-300 transition hover:bg-danger-50 hover:text-danger-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label={`Remove item ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Part Number"
          required
          placeholder="PN-10023"
          value={row.partNumber}
          error={errors[`items.${index}.partNumber`]}
          onChange={(e) => onChange(row.id, "partNumber", e.target.value)}
        />
        <Input
          label="Part Description"
          required
          className="lg:col-span-2"
          containerClassName="lg:col-span-2"
          placeholder="3-Phase Induction Motor, 5HP"
          value={row.partDescription}
          error={errors[`items.${index}.partDescription`]}
          onChange={(e) => onChange(row.id, "partDescription", e.target.value)}
        />
        <Select
          label="Availability"
          placeholder="Select status"
          options={AVAILABILITY_OPTIONS}
          value={row.availability}
          error={errors[`items.${index}.availability`]}
          onChange={(e) => onChange(row.id, "availability", e.target.value)}
        />
        <Input
          label="Quantity"
          required
          type="number"
          min="0"
          step="1"
          placeholder="0"
          value={row.quantity}
          error={errors[`items.${index}.quantity`]}
          onChange={(e) => onChange(row.id, "quantity", e.target.value)}
        />
        <Input
          label="Unit Price"
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={row.unitPrice}
          error={errors[`items.${index}.unitPrice`]}
          onChange={(e) => onChange(row.id, "unitPrice", e.target.value)}
        />
        <Input
          label="Other Rate"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={row.otherRate}
          error={errors[`items.${index}.otherRate`]}
          onChange={(e) => onChange(row.id, "otherRate", e.target.value)}
        />
        <Input
          label="Discount (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="0"
          value={row.discount}
          error={errors[`items.${index}.discount`]}
          onChange={(e) => onChange(row.id, "discount", e.target.value)}
        />
        <Input
          label="Price (W.E.F.)"
          type="date"
          value={row.priceWef}
          error={errors[`items.${index}.priceWef`]}
          onChange={(e) => onChange(row.id, "priceWef", e.target.value)}
        />
        <Input
          label="Live Stock"
          type="number"
          min="0"
          step="1"
          placeholder="Units available"
          value={row.liveStock}
          error={errors[`items.${index}.liveStock`]}
          onChange={(e) => onChange(row.id, "liveStock", e.target.value)}
        />
      </div>
    </div>
  );
}
