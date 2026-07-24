"use client";

import { Plus } from "lucide-react";
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
          <Badge tone="accent">
            {items.length} {items.length === 1 ? "item" : "items"}
          </Badge>
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
