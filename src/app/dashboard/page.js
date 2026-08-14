"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardList,
  IndianRupee,
  Trophy,
  Clock,
  TrendingDown,
  Percent,
  Calculator,
  Package,
  RefreshCw,
  LayoutDashboard,
  Filter,
  Calendar,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/formatters";
import { toDateKey, addDays, startOfWeek } from "@/lib/utils/dateUtils";
import {
  TrendChart,
  BarChart,
  StackedBarChart,
  HBarChart,
  DonutChart,
  CHART_COLORS,
} from "@/components/dashboard/charts";
import FollowupsModal from "@/components/dashboard/FollowupsModal";
import DashboardFilterBar from "@/components/dashboard/DashboardFilterBar";

const DEFAULT_FILTERS = {
  dateRange: "All Time",
  division: "All",
  orderStatus: "All",
  enquiryGeneratedBy: "All",
  followupStatus: "All",
  fromDate: "",
  toDate: "",
};

function resolveRange(dateRange, fromDate, toDate) {
  const now = new Date();
  if (dateRange === "Today") {
    const key = toDateKey(now);
    return { from: key, to: key };
  }
  if (dateRange === "This Week") {
    const start = startOfWeek(now);
    return { from: toDateKey(start), to: toDateKey(addDays(start, 6)) };
  }
  if (dateRange === "This Month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toDateKey(start), to: toDateKey(end) };
  }
  if (dateRange === "This Year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { from: toDateKey(start), to: toDateKey(end) };
  }
  if (dateRange === "Custom Range") {
    return { from: fromDate || "", to: toDate || "" };
  }
  return { from: "", to: "" };
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function KpiCard({ label, value, sub, icon: Icon, tint, className, onClick, clickable }) {
  return (
    <Card 
      className={cn("p-4 sm:p-5", clickable && "cursor-pointer hover:shadow-card-hover transition-shadow", className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-ink-900 sm:text-[26px] sm:leading-8">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-ink-400">{sub}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tint)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function SkeletonBlock({ className }) {
  return <div className={cn("animate-pulse rounded-xl2 bg-ink-100", className)} />;
}

export default function DashboardPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [me, setMe] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showFollowups, setShowFollowups] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) setMe(json.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFilterChange = useCallback((changes) => {
    setFilters((f) => ({ ...f, ...changes }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange !== "All Time") count += 1;
    if (filters.dateRange === "Custom Range" && (filters.fromDate || filters.toDate)) count += 1;
    if (filters.division !== "All") count += 1;
    if (filters.orderStatus !== "All") count += 1;
    if (filters.enquiryGeneratedBy !== "All") count += 1;
    if (filters.followupStatus !== "All") count += 1;
    return count;
  }, [filters]);

  const query = useMemo(() => {
    const { from, to } = resolveRange(filters.dateRange, filters.fromDate, filters.toDate);
    const rangeInvalid =
      filters.dateRange === "Custom Range" && Boolean(from && to && from > to);
    if (rangeInvalid) return null;

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (filters.division !== "All") params.set("division", filters.division);
    if (filters.orderStatus !== "All") params.set("orderStatus", filters.orderStatus);
    if (filters.enquiryGeneratedBy !== "All") params.set("enquiryGeneratedBy", filters.enquiryGeneratedBy);
    if (filters.followupStatus !== "All") params.set("followupStatus", filters.followupStatus);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    if (query === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/dashboard${query ? `?${query}` : ""}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.message || "Failed to load dashboard data.");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Network error.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, reloadToken]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const s = data.summary;
    return [
      {
        label: "Total Quotations",
        value: s.totalQuotations,
        sub: `₹ ${formatCurrency(s.totalAmount)} total value`,
        icon: ClipboardList,
        tint: "bg-accent-50 text-accent-600",
      },
      {
        label: "Total Amount",
        value: formatCompactCurrency(s.totalAmount),
        sub: `across ${s.totalQuotations} quotations`,
        icon: IndianRupee,
        tint: "bg-teal-50 text-teal-600",
      },
      {
        label: "Won",
        value: s.wonCount,
        sub: `${formatCompactCurrency(s.wonAmount)} won value`,
        icon: Trophy,
        tint: "bg-teal-50 text-teal-600",
      },
      {
        label: "Pending",
        value: s.openCount,
        sub: `${formatCompactCurrency(s.openAmount)} in pipeline`,
        icon: Clock,
        tint: "bg-amber-50 text-amber-600",
      },
      {
        label: "Lost + Dead",
        value: s.closedCount,
        sub: `${formatCompactCurrency(s.closedAmount)} value`,
        icon: TrendingDown,
        tint: "bg-danger-50 text-danger-600",
      },
      {
        label: "Conversion Rate",
        value: `${s.conversionRate}%`,
        sub: "won ÷ total quotations",
        icon: Percent,
        tint: "bg-accent-50 text-accent-600",
      },
      {
        label: "Pending Follow-ups",
        value: data.pendingFollowupCount || 0,
        sub: "current pending across all dates",
        icon: Calendar,
        tint: "bg-amber-50 text-amber-600",
        onClick: () => setShowFollowups(true),
        clickable: true,
      },
      {
        label: "Items Quoted",
        value: s.totalItems,
        sub: "total line items",
        icon: Package,
        tint: "bg-accent-50 text-accent-600",
      },
    ];
  }, [data]);

  const charts = useMemo(() => {
    if (!data) return null;

    const trendData = (data.byDate || []).map((d) => ({
      label: d.label,
      count: d.count,
      amount: d.amount,
    }));

    const statusData = (data.byOrderStatus || []).map((d) => ({
      label: d.status,
      count: d.count,
      amount: d.amount,
    }));

    const divisionTotal = (data.byDivision || []).reduce((s, d) => s + d.amount, 0);
    const divisionRows = (data.byDivision || []).map((d) => ({
      ...d,
      percentage: pct(d.amount, divisionTotal),
    }));

    const sourceData = (data.bySourceOfEnquiry || []).map((d) => ({
      label: d.source,
      count: d.count,
      amount: d.amount,
      percentage: d.percentage,
    }));

    const engineerRows = (data.byEngineer || []).map((d) => ({
      label: d.engineer,
      count: d.count,
      amount: d.amount,
      percentage: d.percentage,
    }));

    const weeklyTrend = data.weeklyTrend || [];
    const weeklyTotal = weeklyTrend.reduce((s, w) => s + w.count, 0);

    const topCustomerRows = (data.topCustomers || []).map((d, i) => ({
      ...d,
      rank: i + 1,
    }));

    return {
      trendData,
      statusData,
      divisionBars: divisionRows.map((d) => ({ label: d.division, amount: d.amount })),
      divisionRows,
      sourceData,
      engineerRows,
      engineerBars: engineerRows.map((d) => ({ label: d.engineer, amount: d.amount })),
      weeklyTrend,
      weeklyTotal,
      topCustomerRows,
    };
  }, [data]);

  const hasData = Boolean(data && data.summary && data.summary.totalQuotations > 0);
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <AppShell breadcrumb="Dashboard" title="Quotation Dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-accent-50 text-accent-600">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-600">
              {data && !loading
                ? `${data.summary.totalQuotations} quotation${data.summary.totalQuotations === 1 ? "" : "s"} in view`
                : "Loading live figures from your Google Sheet..."}
            </p>
            <p className="text-xs text-ink-400">
              {me
                ? `Signed in as ${me.username} · figures refresh from the sheet on every load.`
                : "Figures refresh from the sheet every time you load the dashboard."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            icon={Filter} 
            onClick={() => setShowFilters(!showFilters)}
          >
            Filter
          </Button>
        </div>
      </div>

      {!error && !loading && data && showFilters && (
        <div className="mt-4 animate-fade-slide-in">
          <DashboardFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            activeFilterCount={activeFilterCount}
            divisionOptions={data.filters ? data.filters.divisions : []}
            engineerOptions={data.filters ? data.filters.engineers : []}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {error && (
        <Card className="mt-6 flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Could not load dashboard
          </h2>
          <p className="max-w-sm text-sm text-ink-400">{error}</p>
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => setReloadToken((t) => t + 1)}
          >
            Retry
          </Button>
        </Card>
      )}

      {!error && loading && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <SkeletonBlock className="h-80 lg:col-span-8" />
            <SkeletonBlock className="h-80 lg:col-span-4" />
            <SkeletonBlock className="h-80 lg:col-span-4" />
            <SkeletonBlock className="h-80 lg:col-span-4" />
            <SkeletonBlock className="h-80 lg:col-span-4" />
          </div>
        </div>
      )}

      {!error && !loading && data && !hasData && (
        <Card className="mt-6 flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg font-semibold text-ink-900">
            {hasActiveFilters ? "No matching quotation data" : "No quotation data yet"}
          </h2>
          <p className="max-w-sm text-sm text-ink-400">
            {hasActiveFilters
              ? "Try a different date range, division or order status."
              : "Once quotations are saved to the Google Sheet, the dashboard will show your pipeline, trends and performance here."}
          </p>
          {!hasActiveFilters && (
            <Link href="/quotations/new" className="mt-2">
              <Button>
                <ClipboardList className="h-4 w-4" />
                Create Quotation
              </Button>
            </Link>
          )}
        </Card>
      )}

      {!error && !loading && hasData && charts && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader
                eyebrow="Analytics"
                title="Quotation Trend"
                description="Count of quotations over time"
              />
              <CardBody>
                <TrendChart data={charts.trendData} valueKey="count" />
              </CardBody>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader
                eyebrow="Pipeline"
                title="Order Status"
                description="Distribution by order status"
              />
              <CardBody>
                <DonutChart data={charts.statusData} valueKey="count" secondaryKey="amount" />
              </CardBody>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader
                eyebrow="Divisions"
                title="Amount by Division"
                description="Quotation value across divisions"
              />
              <CardBody>
                <BarChart
                  data={charts.divisionBars}
                  valueKey="amount"
                  showValues={charts.divisionBars.length <= 6}
                />
                <div className="mt-5 overflow-x-auto rounded-lg border border-ink-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-ink-100 bg-ink-50">
                        {["Division", "Count", "Amount", "%"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-ink-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {charts.divisionRows.map((row, i) => (
                        <tr key={row.division} className="border-b border-ink-50">
                          <td className="px-3 py-2 font-medium text-ink-700">
                            <span
                              className="mr-2 inline-block h-2 w-2 rounded-sm"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            {row.division}
                          </td>
                          <td className="px-3 py-2 font-mono text-ink-600">{row.count}</td>
                          <td className="px-3 py-2 font-mono text-ink-600">
                            {formatCompactCurrency(row.amount)}
                          </td>
                          <td className="px-3 py-2 font-mono text-ink-400">{row.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader
                eyebrow="Enquiry"
                title="Source of Enquiry"
                description="Where quotations come from"
              />
              <CardBody>
                <DonutChart data={charts.sourceData} valueKey="count" secondaryKey="amount" />
              </CardBody>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader
                eyebrow="Sales Team"
                title="Amount by Engineer"
                description="Top 10 engineers + others"
              />
              <CardBody>
                <HBarChart data={charts.engineerBars} valueKey="amount" />
              </CardBody>
            </Card>

            <Card className="lg:col-span-8">
              <CardHeader
                eyebrow="Performance"
                title="Weekly Quotation Performance"
                description={`${charts.weeklyTrend.length} weeks, ${charts.weeklyTotal} quotations`}
              />
              <CardBody>
                <StackedBarChart data={charts.weeklyTrend} valueKey="count" />
              </CardBody>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader eyebrow="Customers" title="Top Customers" description="By quotation value" />
              <CardBody className="px-2 sm:px-2">
                <div className="space-y-3">
                  {charts.topCustomerRows.map((row) => (
                    <div key={row.customerName} className="flex items-center gap-3 rounded-lg px-3 py-1.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-50 font-mono text-xs font-semibold text-ink-500">
                        {row.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-800" title={row.customerName}>
                          {row.customerName}
                        </p>
                        <p className="text-xs text-ink-400">
                          {row.count} quotation{row.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold text-ink-800">
                        {formatCompactCurrency(row.amount)}
                      </span>
                    </div>
                  ))}
                  {charts.topCustomerRows.length === 0 && (
                    <p className="px-3 py-4 text-center text-sm text-ink-300">No customer data</p>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {!error && !loading && data && (
        <div className="mt-6">
          <Card>
            <CardHeader
              eyebrow="Actionable"
              title="Follow-ups"
              description="Current follow-up per quotation — filtered by Follow-up Status and Next Followup Date"
            />
            <CardBody>
              {data.followups && data.followups.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-ink-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-ink-50 border-b border-ink-100">
                        {["Quotation No", "Customer Name", "Next Followup Date", "Followup Status", "Followup Remark"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.followups.map((f, idx) => (
                        <tr key={idx} className="border-b border-ink-50 transition-colors hover:bg-ink-50/50">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-accent-600 whitespace-nowrap">
                            {f.quotationNo}
                          </td>
                          <td className="px-4 py-3 max-w-[220px] truncate font-medium text-ink-900" title={f.customerName}>
                            {f.customerName}
                          </td>
                          <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                            {f.nextFollowupDate}
                          </td>
                          <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                            {f.followupStatus}
                          </td>
                          <td className="px-4 py-3 max-w-[300px] truncate text-ink-600" title={f.followupRemark}>
                            {f.followupRemark}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-ink-400">
                  No current follow-ups match the selected filters.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {showFollowups && (
        <FollowupsModal
          isOpen={showFollowups}
          onClose={() => setShowFollowups(false)}
        />
      )}

    </AppShell>
  );
}
