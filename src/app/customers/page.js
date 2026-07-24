"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import CustomerToolbar from "@/components/customers/CustomerToolbar";
import CustomerTable from "@/components/customers/CustomerTable";
import Pagination from "@/components/customers/Pagination";
import CustomerFormModal from "@/components/customers/CustomerFormModal";
import DeleteDialog from "@/components/customers/DeleteDialog";
import { useToast } from "@/hooks/useToast";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [formCustomer, setFormCustomer] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const searchTimer = useRef(null);

  const toast = useToast();
  const LIMIT = 25;

  const fetchCustomers = useCallback(async (opts = {}) => {
    const p = opts.page ?? page;
    const s = opts.search ?? search;
    const sb = opts.sortBy ?? sortBy;
    const so = opts.sortOrder ?? sortOrder;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: p,
        limit: LIMIT,
        sortBy: sb,
        sortOrder: so,
      });
      if (s) params.set("search", s);

      const res = await fetch(`/api/customers?${params}`);
      const json = await res.json();

      if (json.success) {
        setCustomers(json.data);
        setTotal(json.total);
        setPage(json.page);
        setTotalPages(json.totalPages);
      } else {
        toast.error("Error", json.message || "Failed to fetch customers.");
      }
    } catch {
      toast.error("Network error", "Couldn't fetch customers.");
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  function handleSearchChange(value) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchCustomers({ page: 1, search: value });
    }, 350);
  }

  function handleSort(column) {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((o) => {
          const next = o === "asc" ? "desc" : "asc";
          setPage(1);
          fetchCustomers({ page: 1, sortBy: column, sortOrder: next });
          return next;
        });
        return prev;
      } else {
        setPage(1);
        fetchCustomers({ page: 1, sortBy: column, sortOrder: "asc" });
        return column;
      }
    });
  }

  function handlePageChange(newPage) {
    setPage(newPage);
    fetchCustomers({ page: newPage });
  }

  function handleRefresh() {
    fetchCustomers();
  }

  function openAddForm() {
    setFormCustomer(null);
    setFormOpen(true);
  }

  function openEditForm(customer) {
    setFormCustomer(customer);
    setFormOpen(true);
  }

  async function handleSave(formData) {
    setFormLoading(true);
    try {
      const url = formCustomer
        ? `/api/customers/${formCustomer._id}`
        : "/api/customers";
      const method = formCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setFormOpen(false);
        setFormCustomer(null);
        fetchCustomers();
      } else {
        toast.error("Error", json.message || "Operation failed.");
      }
    } catch {
      toast.error("Network error", "Please check your connection.");
    } finally {
      setFormLoading(false);
    }
  }

  function openDeleteDialog(customer) {
    setDeleteCustomer(customer);
  }

  async function handleDelete() {
    if (!deleteCustomer) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/customers/${deleteCustomer._id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setDeleteCustomer(null);
        fetchCustomers();
      } else {
        toast.error("Error", json.message || "Delete failed.");
      }
    } catch {
      toast.error("Network error", "Please check your connection.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <AppShell title="Customer Master" breadcrumb="Customers">
      <div className="space-y-4">
        <CustomerToolbar
          search={search}
          onSearchChange={handleSearchChange}
          onRefresh={handleRefresh}
          loading={loading}
          customerCount={total}
          onAdd={openAddForm}
        />

        <CustomerTable
          customers={customers}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onEdit={openEditForm}
          onDelete={openDeleteDialog}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
          onPageChange={handlePageChange}
        />
      </div>

      {formOpen && (
        <CustomerFormModal
          customer={formCustomer}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setFormCustomer(null); }}
          loading={formLoading}
        />
      )}

      {deleteCustomer && (
        <DeleteDialog
          customer={deleteCustomer}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteCustomer(null); }}
          loading={deleteLoading}
        />
      )}
    </AppShell>
  );
}
