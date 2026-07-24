"use client";

import { Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ItemRow from "@/components/quotations/ItemRow";

export default function ItemListSection({ items, errors, onAdd, onRemove, onChangeItem }) {
  return (
    <>
      <CardHeader
        eyebrow="Step 3"
        title="Item List"
        description="Add every part included in this quotation."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/parts"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-accent-600 hover:bg-accent-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Parts
            </Link>
            <Badge tone="accent">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Badge>
          </div>
        }
      />
      <CardBody className="space-y-4">
        {errors["items"] && (
          <p className="text-sm font-medium text-danger-500">{errors["items"]}</p>
        )}
        {items.map((row, index) => (
          <ItemRow
            key={row.id}
            index={index}
            row={row}
            errors={errors}
            onChange={onChangeItem}
            onRemove={onRemove}
            canRemove={items.length > 1}
          />
        ))}

        <Button variant="subtle" icon={Plus} onClick={onAdd} className="w-full sm:w-auto">
          Add Item
        </Button>
      </CardBody>
    </>
  );
}
