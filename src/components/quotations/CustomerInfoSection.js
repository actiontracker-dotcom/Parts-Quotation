"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { CardHeader, CardBody } from "@/components/ui/Card";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import Input from "@/components/ui/Input";
import SearchableDropdown from "@/components/ui/SearchableDropdown";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { DESIGNATIONS } from "@/constants/masterData";

export default function CustomerInfoSection({
  values,
  errors,
  onChange,
  onAddCustomer,
}) {
  const searchCustomers = useCallback(async (query, { signal } = {}) => {
    const res = await fetch(
      `/api/customers/search?q=${encodeURIComponent(query)}`,
      { signal }
    );
    const json = await res.json();
    return json.success ? json.data : [];
  }, []);

  function handleSelectCustomer(customer) {
    onChange("customerName", customer.customerName);
    onChange(
      "fullAddressGst",
      customer.fullAddressWithGST ||
        [customer.fullAddress, customer.gstNo && `GSTIN: ${customer.gstNo}`]
          .filter(Boolean)
          .join("\n")
    );
    onChange("fullAddress", customer.fullAddress || "");
    onChange("gstNo", customer.gstNo || "");
    onChange("stateName", customer.stateName || "");
    onChange("stateCode", customer.stateCode || "");
    if (customer.contactPerson) onChange("contactPerson", customer.contactPerson);
    if (customer.contactNumber) onChange("contactNumber", customer.contactNumber);
    if (customer.designation) onChange("designation", customer.designation);
    if (customer.email) onChange("emailTo", customer.email);
    if (customer.emailCc) onChange("emailCc", customer.emailCc);
    if (customer.location) onChange("location", customer.location);
    if (customer.userId) onChange("userId", customer.userId);
    if (customer.engineerRemark) onChange("engineerRemark", customer.engineerRemark);
  }

  return (
    <>
      <CardHeader
        eyebrow="Step 1"
        title="Customer Information"
        description="Who is this quotation for, and who should receive it."
        action={
          <Button variant="subtle" size="sm" icon={Plus} onClick={onAddCustomer}>
            Add Customer
          </Button>
        }
      />
      <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AutocompleteInput
            label="Customer Name"
            required
            placeholder="Acme Engineering Pvt. Ltd."
            value={values.customerName}
            onChange={(val) => onChange("customerName", val)}
            onSelect={handleSelectCustomer}
            fetchSuggestions={searchCustomers}
            error={errors["customer.customerName"]}
          />
        </div>

        <Input
          label="Contact Person"
          placeholder="Rohit Sharma"
          value={values.contactPerson}
          error={errors["customer.contactPerson"]}
          onChange={(e) => onChange("contactPerson", e.target.value)}
        />

        <Textarea
          label="Full Address with GST"
          required
          rows={2}
          className="sm:col-span-2"
          placeholder="Plot 14, Industrial Estate, Pune, MH — GSTIN: 27AAAAA0000A1Z5"
          value={values.fullAddressGst}
          error={errors["customer.fullAddressGst"]}
          onChange={(e) => onChange("fullAddressGst", e.target.value)}
        />
        <Input
          label="Contact Number"
          placeholder="+91 98765 43210"
          value={values.contactNumber}
          error={errors["customer.contactNumber"]}
          onChange={(e) => onChange("contactNumber", e.target.value)}
        />
        <SearchableDropdown
          label="Designation"
          placeholder="Procurement Manager"
          items={DESIGNATIONS}
          value={values.designation}
          error={errors["customer.designation"]}
          onChange={(val) => onChange("designation", val)}
        />
        <Input
          label="Email ID To"
          type="email"
          placeholder="buyer@company.com"
          value={values.emailTo}
          error={errors["customer.emailTo"]}
          onChange={(e) => onChange("emailTo", e.target.value)}
        />
        <Input
          label="Email CC"
          placeholder="team@company.com, manager@company.com"
          hint="Separate multiple addresses with commas"
          value={values.emailCc}
          error={errors["customer.emailCc"]}
          onChange={(e) => onChange("emailCc", e.target.value)}
        />
        <Input
          label="Location"
          placeholder="Enter location"
          value={values.location}
          error={errors["customer.location"]}
          onChange={(e) => onChange("location", e.target.value)}
        />
        <Input
          label="User ID"
          placeholder="Sales executive ID"
          value={values.userId}
          error={errors["customer.userId"]}
          onChange={(e) => onChange("userId", e.target.value)}
        />
        <Textarea
          label="Engineer Remark"
          rows={2}
          className="sm:col-span-2"
          placeholder="Any technical notes for this quotation"
          value={values.engineerRemark}
          error={errors["customer.engineerRemark"]}
          onChange={(e) => onChange("engineerRemark", e.target.value)}
        />
      </CardBody>
    </>
  );
}
