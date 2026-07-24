"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";

const INITIAL = {
  partNo: "",
  description: "",
  group: "",
  subGroup: "",
  aRaipur: "",
  bRaigarh: "",
  cAmbikapur: "",
  dSatna: "",
  lastPurchaseDate: "",
  applicableDate: "",
  standardRate: "",
  locationRaipur: "",
  locationRaigarh: "",
  locationAmbikapur: "",
  locationSatna: "",
  raipurStockValue: "",
  raigarhStockValue: "",
  ambikapurStockValue: "",
  satnaStockValue: "",
  stockStatus: "",
  lowStock: "",
  outOfStock: "",
  inStock: "",
  minimumQty: "",
  pendingOrderInHO: "",
  needToOrder: "",
  status: "active",
  hsnCode: "",
  totalQty: "",
  totalPrice: "",
};

const STOCK_STATUS_OPTIONS = [
  { value: "In Stock", label: "In Stock" },
  { value: "Out of Stock", label: "Out of Stock" },
  { value: "Low Stock", label: "Low Stock" },
  { value: "Discontinued", label: "Discontinued" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function toDateInputValue(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function PartFormModal({ part, onSave, onCancel, loading }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const isEdit = !!part;

  useEffect(() => {
    if (part) {
      setForm({
        partNo: part.partNo || "",
        description: part.description || "",
        group: part.group || "",
        subGroup: part.subGroup || "",
        aRaipur: part.aRaipur ?? "",
        bRaigarh: part.bRaigarh ?? "",
        cAmbikapur: part.cAmbikapur ?? "",
        dSatna: part.dSatna ?? "",
        lastPurchaseDate: toDateInputValue(part.lastPurchaseDate),
        applicableDate: toDateInputValue(part.applicableDate),
        standardRate: part.standardRate ?? "",
        locationRaipur: part.locationRaipur || "",
        locationRaigarh: part.locationRaigarh || "",
        locationAmbikapur: part.locationAmbikapur || "",
        locationSatna: part.locationSatna || "",
        raipurStockValue: part.raipurStockValue ?? "",
        raigarhStockValue: part.raigarhStockValue ?? "",
        ambikapurStockValue: part.ambikapurStockValue ?? "",
        satnaStockValue: part.satnaStockValue ?? "",
        stockStatus: part.stockStatus || "",
        lowStock: part.lowStock ?? "",
        outOfStock: part.outOfStock ?? "",
        inStock: part.inStock ?? "",
        minimumQty: part.minimumQty ?? "",
        pendingOrderInHO: part.pendingOrderInHO ?? "",
        needToOrder: part.needToOrder ?? "",
        status: part.status || "active",
        hsnCode: part.hsnCode || "",
        totalQty: part.totalQty ?? "",
        totalPrice: part.totalPrice ?? "",
      });
    } else {
      setForm(INITIAL);
    }
    setErrors({});
  }, [part]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};
    if (!form.partNo.trim()) {
      newErrors.partNo = "Part number is required.";
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    const payload = { ...form };
    for (const key of Object.keys(payload)) {
      if (payload[key] === "") {
        if (["lastPurchaseDate", "applicableDate"].includes(key)) {
          payload[key] = null;
        } else if (["aRaipur", "bRaigarh", "cAmbikapur", "dSatna", "standardRate",
                     "raipurStockValue", "raigarhStockValue", "ambikapurStockValue", "satnaStockValue",
                     "lowStock", "outOfStock", "inStock", "minimumQty", "pendingOrderInHO",
                     "needToOrder", "totalQty", "totalPrice"].includes(key)) {
          payload[key] = 0;
        }
      }
    }
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink-950/40 cursor-pointer" onClick={onCancel} />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-50">
          <h2 className="text-lg font-semibold text-ink-900">
            {isEdit ? "Edit Part" : "Add Part"}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-ink-300 hover:text-ink-600 hover:bg-ink-50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Part No <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={form.partNo}
                onChange={(e) => set("partNo", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="0070600203"
              />
              {errors.partNo && (
                <p className="text-xs text-danger-500 mt-1">{errors.partNo}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="Part description"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Group</label>
              <input
                type="text"
                value={form.group}
                onChange={(e) => set("group", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="Group"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Sub Group</label>
              <input
                type="text"
                value={form.subGroup}
                onChange={(e) => set("subGroup", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="Sub Group"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">HSN Code</label>
              <input
                type="text"
                value={form.hsnCode}
                onChange={(e) => set("hsnCode", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="HSN"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Standard Rate</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.standardRate}
                onChange={(e) => set("standardRate", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink-700 mb-2">Branch Quantities</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Raipur (Qty)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.aRaipur}
                  onChange={(e) => set("aRaipur", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Raigarh (Qty)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.bRaigarh}
                  onChange={(e) => set("bRaigarh", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Ambikapur (Qty)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.cAmbikapur}
                  onChange={(e) => set("cAmbikapur", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Satna (Qty)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.dSatna}
                  onChange={(e) => set("dSatna", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink-700 mb-2">Stock Values</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Raipur (Value)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.raipurStockValue}
                  onChange={(e) => set("raipurStockValue", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Raigarh (Value)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.raigarhStockValue}
                  onChange={(e) => set("raigarhStockValue", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Ambikapur (Value)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.ambikapurStockValue}
                  onChange={(e) => set("ambikapurStockValue", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Satna (Value)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.satnaStockValue}
                  onChange={(e) => set("satnaStockValue", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink-700 mb-2">Stock Info</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Total Qty</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.totalQty}
                  onChange={(e) => set("totalQty", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Total Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.totalPrice}
                  onChange={(e) => set("totalPrice", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Stock Status</label>
                <select
                  value={form.stockStatus}
                  onChange={(e) => set("stockStatus", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 bg-white cursor-pointer"
                >
                  <option value="">Select status</option>
                  {STOCK_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 bg-white cursor-pointer"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink-700 mb-2">Thresholds</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Low Stock</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.lowStock}
                  onChange={(e) => set("lowStock", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Out of Stock</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.outOfStock}
                  onChange={(e) => set("outOfStock", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">In Stock</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.inStock}
                  onChange={(e) => set("inStock", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Min Qty</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.minimumQty}
                  onChange={(e) => set("minimumQty", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Pending Order in HO</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.pendingOrderInHO}
                onChange={(e) => set("pendingOrderInHO", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Need to Order</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.needToOrder}
                onChange={(e) => set("needToOrder", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Applicable Date</label>
              <input
                type="date"
                value={form.applicableDate}
                onChange={(e) => set("applicableDate", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Location Raipur</label>
              <input
                type="text"
                value={form.locationRaipur}
                onChange={(e) => set("locationRaipur", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Location Raigarh</label>
              <input
                type="text"
                value={form.locationRaigarh}
                onChange={(e) => set("locationRaigarh", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Location Ambikapur</label>
              <input
                type="text"
                value={form.locationAmbikapur}
                onChange={(e) => set("locationAmbikapur", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Location Satna</label>
              <input
                type="text"
                value={form.locationSatna}
                onChange={(e) => set("locationSatna", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Last Purchase Date</label>
              <input
                type="date"
                value={form.lastPurchaseDate}
                onChange={(e) => set("lastPurchaseDate", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-ink-50">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? "Update Part" : "Create Part"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
