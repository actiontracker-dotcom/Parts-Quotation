"use client";

import { useEffect, useRef, useState } from "react";
import { CardHeader, CardBody } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { Loader2, Search, X } from "lucide-react";

export default function CustomerInfoSection({ values, errors, onChange, locations }) {
  const [companySearch, setCompanySearch] = useState("");
  const [companies, setCompanies] = useState([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const companyRef = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!companySearch.trim()) {
      setCompanies([]);
      return;
    }

    searchTimer.current = setTimeout(() => {
      setLoadingCompanies(true);
      fetch(`/api/master/companies?search=${encodeURIComponent(companySearch.trim())}&limit=20`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setCompanies(json.data);
          else setCompanies([]);
        })
        .catch(() => setCompanies([]))
        .finally(() => setLoadingCompanies(false));
    }, 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [companySearch]);

  useEffect(() => {
    if (!selectedCompany) {
      setContacts([]);
      setSelectedContactId("");
      return;
    }

    setLoadingContacts(true);
    fetch(`/api/master/contacts?companyId=${selectedCompany._id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setContacts(json.data);
        else setContacts([]);
      })
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));
  }, [selectedCompany]);

  function handleSelectCompany(company) {
    setSelectedCompany(company);
    setSelectedContactId("");
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);

    onChange("customerName", company.name);
    const addrParts = [company.address].filter(Boolean);
    if (company.gst) addrParts.push(`GSTIN: ${company.gst}`);
    onChange("fullAddressGst", addrParts.join("\n"));
    if (company.location) onChange("location", company.location);
  }

  function handleClearCompany() {
    setSelectedCompany(null);
    setCompanySearch("");
    setCompanies([]);
    setContacts([]);
    setSelectedContactId("");
    onChange("customerName", "");
    onChange("fullAddressGst", "");
    onChange("location", "");
  }

  function handleSelectContact(contactId) {
    setSelectedContactId(contactId);
    const contact = contacts.find((c) => c._id === contactId);
    if (!contact) return;

    onChange("contactPerson", contact.name);
    onChange("emailTo", contact.email);
    onChange("contactNumber", contact.mobile);
    onChange("designation", contact.designation);
  }

  return (
    <>
      <CardHeader
        eyebrow="Step 1"
        title="Customer Information"
        description="Who is this quotation for, and who should receive it."
      />
      <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="relative sm:col-span-2" ref={companyRef}>
          <label className="text-sm font-medium text-ink-600 flex items-center gap-1 mb-1.5">
            Company
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              type="text"
              className="h-10 w-full rounded-lg border border-ink-100 bg-white pl-9 pr-9 text-sm text-ink-800 placeholder:text-ink-300 transition-colors hover:border-ink-200 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-2 focus:ring-offset-surface"
              placeholder="Search company..."
              value={companySearch}
              onChange={(e) => {
                setCompanySearch(e.target.value);
                setShowCompanyDropdown(true);
                if (selectedCompany) handleClearCompany();
              }}
              onFocus={() => {
                if (companySearch.trim()) setShowCompanyDropdown(true);
              }}
            />
            {companySearch && (
              <button
                type="button"
                onClick={handleClearCompany}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showCompanyDropdown && companySearch.trim() && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-ink-100 bg-white shadow-card-hover max-h-60 overflow-y-auto">
              {loadingCompanies ? (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-ink-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : companies.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-300">
                  No companies found
                </p>
              ) : (
                companies.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-accent-50 hover:text-accent-700 transition-colors border-b border-ink-50 last:border-0"
                    onClick={() => handleSelectCompany(c)}
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.location && (
                      <span className="ml-2 text-xs text-ink-400">{c.location}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <Input
          label="Customer Name"
          required
          placeholder="Acme Engineering Pvt. Ltd."
          value={values.customerName}
          error={errors["customer.customerName"]}
          onChange={(e) => onChange("customerName", e.target.value)}
        />

        {selectedCompany ? (
          <Select
            label="Contact Person"
            required
            placeholder={loadingContacts ? "Loading contacts..." : "Select contact"}
            options={contacts.map((c) => ({ value: c._id, label: c.name }))}
            value={selectedContactId}
            onChange={(e) => handleSelectContact(e.target.value)}
            hint={contacts.length === 0 && !loadingContacts ? "No contacts for this company" : undefined}
          />
        ) : (
          <Input
            label="Contact Person"
            required
            placeholder="Rohit Sharma"
            value={values.contactPerson}
            error={errors["customer.contactPerson"]}
            onChange={(e) => onChange("contactPerson", e.target.value)}
          />
        )}

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
          required
          placeholder="+91 98765 43210"
          value={values.contactNumber}
          error={errors["customer.contactNumber"]}
          onChange={(e) => onChange("contactNumber", e.target.value)}
        />
        <Input
          label="Designation"
          placeholder="Procurement Manager"
          value={values.designation}
          error={errors["customer.designation"]}
          onChange={(e) => onChange("designation", e.target.value)}
        />
        <Input
          label="Email ID To"
          required
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
        <Select
          label="Location"
          placeholder="Select location"
          options={locations}
          value={values.location}
          error={errors["customer.location"]}
          onChange={(e) => onChange("location", e.target.value)}
        />
        <Input
          label="User ID"
          required
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
