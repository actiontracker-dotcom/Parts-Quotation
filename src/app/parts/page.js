"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import PartToolbar from "@/components/parts/PartToolbar";
import PartTable from "@/components/parts/PartTable";
import Pagination from "@/components/customers/Pagination";
import PartFormModal from "@/components/parts/PartFormModal";
import PartDeleteDialog from "@/components/parts/PartDeleteDialog";
import { useToast } from "@/hooks/useToast";

export default function PartsPage() {
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [formPart, setFormPart] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [deletePart, setDeletePart] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const searchTimer = useRef(null);

  const toast = useToast();
  const LIMIT = 25;

  const fetchParts = useCallback(async (opts = {}) => {
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

      const res = await fetch(`/api/parts?${params}`);
      const json = await res.json();

      if (json.success) {
        setParts(json.data);
        setTotal(json.total);
        setPage(json.page);
        setTotalPages(json.totalPages);
      } else {
        toast.error("Error", json.message || "Failed to fetch parts.");
      }
    } catch {
      toast.error("Network error", "Couldn't fetch parts.");
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortOrder, toast]);

  useEffect(() => {
    fetchParts();
  }, []);

  function handleSearchChange(value) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchParts({ page: 1, search: value });
    }, 350);
  }

  function handleSort(column) {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((o) => {
          const next = o === "asc" ? "desc" : "asc";
          setPage(1);
          fetchParts({ page: 1, sortBy: column, sortOrder: next });
          return next;
        });
        return prev;
      } else {
        setPage(1);
        fetchParts({ page: 1, sortBy: column, sortOrder: "asc" });
        return column;
      }
    });
  }

  function handlePageChange(newPage) {
    setPage(newPage);
    fetchParts({ page: newPage });
  }

  function handleRefresh() {
    fetchParts();
  }

  function openAddForm() {
    setFormPart(null);
    setFormOpen(true);
  }

  function openEditForm(part) {
    setFormPart(part);
    setFormOpen(true);
  }

  async function handleSave(formData) {
    setFormLoading(true);
    try {
      const url = formPart
        ? `/api/parts/${formPart._id}`
        : "/api/parts";
      const method = formPart ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setFormOpen(false);
        setFormPart(null);
        fetchParts();
      } else {
        toast.error("Error", json.message || "Operation failed.");
      }
    } catch {
      toast.error("Network error", "Please check your connection.");
    } finally {
      setFormLoading(false);
    }
  }

  function openDeleteDialog(part) {
    setDeletePart(part);
  }

  async function handleDelete() {
    if (!deletePart) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/parts/${deletePart._id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setDeletePart(null);
        fetchParts();
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
    <AppShell title="Part Master" breadcrumb="Parts">
      <div className="space-y-4">
        <PartToolbar
          search={search}
          onSearchChange={handleSearchChange}
          onRefresh={handleRefresh}
          loading={loading}
          partCount={total}
          onAdd={openAddForm}
        />

        <PartTable
          parts={parts}
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
        <PartFormModal
          part={formPart}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setFormPart(null); }}
          loading={formLoading}
        />
      )}

      {deletePart && (
        <PartDeleteDialog
          part={deletePart}
          onConfirm={handleDelete}
          onCancel={() => { setDeletePart(null); }}
          loading={deleteLoading}
        />
      )}
    </AppShell>
  );
}
