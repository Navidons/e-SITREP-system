"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TabGroup } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { LoadingBlock, TableSkeleton } from "@/components/ui/loading";
import { Spinner } from "@/components/ui/spinner";
import { AdminReportsPanel } from "@/components/admin/AdminReportsPanel";
import { Field, inputClassName } from "@/components/ui/field";
import {
  ASSIGNABLE_ROLES,
  menusForRoles,
  roleNeedsStation,
} from "@/lib/admin/navigation";

type StationOption = {
  id: number;
  code: string;
  name: string;
  active: boolean;
};

type UserRow = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
  stationId: number | null;
  station: { code: string; name: string } | null;
  roles: string[];
};

type StationRow = {
  id: number;
  code: string;
  name: string;
  cluster: string | null;
  type: string | null;
  location: string | null;
  active: boolean;
  userCount: number;
};

const emptyUserForm = () => ({
  username: "",
  fullName: "",
  email: "",
  password: "",
  stationId: "" as string | number,
  roleNames: [] as string[],
  isActive: true,
});

export function AdminConsole() {
  const [mainTab, setMainTab] = useState<"admin" | "reports">("admin");
  const [tab, setTab] = useState<"users" | "stations">("users");
  const [stations, setStations] = useState<StationOption[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stationRows, setStationRows] = useState<StationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // Search & Filtering States
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStationFilter, setUserStationFilter] = useState("all");

  const [stationSearch, setStationSearch] = useState("");
  const [stationStatusFilter, setStationStatusFilter] = useState("all");
  const [stationClusterFilter, setStationClusterFilter] = useState("all");

  // Computed Database Statistics
  const userStats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    
    // Count roles
    const rolesCount: Record<string, number> = {};
    users.forEach((u) => {
      u.roles.forEach((r) => {
        rolesCount[r] = (rolesCount[r] || 0) + 1;
      });
    });

    return { total, active, inactive, rolesCount };
  }, [users]);

  const stationStats = useMemo(() => {
    const total = stationRows.length;
    const active = stationRows.filter((s) => s.active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [stationRows]);

  const uniqueClusters = useMemo(() => {
    const allClusters = stationRows.map((s) => s.cluster).filter(Boolean) as string[];
    return Array.from(new Set(allClusters)).sort();
  }, [stationRows]);

  // Real-Time Filtered Lists
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const searchLower = userSearch.toLowerCase();
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchLower) ||
        u.username.toLowerCase().includes(searchLower) ||
        (u.email && u.email.toLowerCase().includes(searchLower)) ||
        (u.station && u.station.name.toLowerCase().includes(searchLower));

      const matchesStatus =
        userStatusFilter === "all"
          ? true
          : userStatusFilter === "active"
            ? u.isActive
            : !u.isActive;

      const matchesRole =
        userRoleFilter === "all" ? true : u.roles.includes(userRoleFilter);

      const matchesStation =
        userStationFilter === "all"
          ? true
          : u.stationId === Number(userStationFilter);

      return matchesSearch && matchesStatus && matchesRole && matchesStation;
    });
  }, [users, userSearch, userStatusFilter, userRoleFilter, userStationFilter]);

  const filteredStations = useMemo(() => {
    return stationRows.filter((s) => {
      const searchLower = stationSearch.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(searchLower) ||
        s.code.toLowerCase().includes(searchLower) ||
        (s.cluster && s.cluster.toLowerCase().includes(searchLower)) ||
        (s.type && s.type.toLowerCase().includes(searchLower));

      const matchesStatus =
        stationStatusFilter === "all"
          ? true
          : stationStatusFilter === "active"
            ? s.active
            : !s.active;

      const matchesCluster =
        stationClusterFilter === "all"
          ? true
          : s.cluster === stationClusterFilter;

      return matchesSearch && matchesStatus && matchesCluster;
    });
  }, [stationRows, stationSearch, stationStatusFilter, stationClusterFilter]);

  const [stationForm, setStationForm] = useState({
    code: "",
    name: "",
    cluster: "",
    type: "",
    location: "",
    active: true,
  });
  const [editingStationId, setEditingStationId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metaRes, usersRes, stationsRes] = await Promise.all([
        fetch("/api/admin/meta"),
        fetch("/api/admin/users"),
        fetch("/api/admin/stations"),
      ]);
      if (!metaRes.ok || !usersRes.ok || !stationsRes.ok) {
        throw new Error("Failed to load admin data");
      }
      const meta = await metaRes.json();
      const usersJson = await usersRes.json();
      const stationsJson = await stationsRes.json();
      setStations(Array.isArray(meta.stations) ? meta.stations : []);
      setUsers(Array.isArray(usersJson.users) ? usersJson.users : []);
      setStationRows(
        Array.isArray(stationsJson.stations) ? stationsJson.stations : [],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mainTabs = [
    { id: "admin" as const, label: "Users & stations" },
    { id: "reports" as const, label: "Reports & SITREP" },
  ];

  const subTabs = [
    { id: "users" as const, label: "Users" },
    { id: "stations" as const, label: "Stations" },
  ];

  const needsStation = useMemo(
    () => roleNeedsStation(userForm.roleNames),
    [userForm.roleNames],
  );

  function toggleRole(role: string) {
    setUserForm((f) => ({
      ...f,
      roleNames: f.roleNames.includes(role)
        ? f.roleNames.filter((r) => r !== role)
        : [...f.roleNames, role],
    }));
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const payload = {
      username: userForm.username.trim(),
      fullName: userForm.fullName.trim(),
      email: userForm.email.trim() || null,
      password: userForm.password || undefined,
      stationId: needsStation ? Number(userForm.stationId) : null,
      roleNames: userForm.roleNames,
      isActive: userForm.isActive,
    };
    const url = editingUserId
      ? `/api/admin/users/${editingUserId}`
      : "/api/admin/users";
    const res = await fetch(url, {
      method: editingUserId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setMessage(editingUserId ? "User updated." : "User created.");
    setUserForm(emptyUserForm());
    setEditingUserId(null);
    load();
  }

  function editUser(u: UserRow) {
    setEditingUserId(u.id);
    setUserForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email ?? "",
      password: "",
      stationId: u.stationId ?? "",
      roleNames: [...u.roles],
      isActive: u.isActive,
    });
  }

  async function saveStation(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const payload = {
      code: stationForm.code.trim().toUpperCase(),
      name: stationForm.name.trim().toUpperCase(),
      cluster: stationForm.cluster.trim() || null,
      type: stationForm.type.trim() || null,
      location: stationForm.location.trim() || null,
      active: stationForm.active,
    };
    const url = editingStationId
      ? `/api/admin/stations/${editingStationId}`
      : "/api/admin/stations";
    const res = await fetch(url, {
      method: editingStationId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setMessage(editingStationId ? "Station updated." : "Station created.");
    setEditingStationId(null);
    setStationForm({
      code: "",
      name: "",
      cluster: "",
      type: "",
      location: "",
      active: true,
    });
    load();
  }

  function editStation(s: StationRow) {
    setEditingStationId(s.id);
    setStationForm({
      code: s.code,
      name: s.name,
      cluster: s.cluster ?? "",
      type: s.type ?? "",
      location: s.location ?? "",
      active: s.active,
    });
  }

  async function toggleUserActive(u: UserRow) {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !u.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to toggle user status");
        return;
      }
      setMessage(`User "${u.fullName}" ${!u.isActive ? "activated" : "deactivated"}.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }

  async function deleteUser(u: UserRow) {
    if (!confirm(`Are you sure you want to permanently delete the user "${u.fullName}"?`)) {
      return;
    }
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to delete user");
        return;
      }
      setMessage(`User "${u.fullName}" successfully deleted.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }

  async function toggleStationActive(s: StationRow) {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stations/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: !s.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to toggle station status");
        return;
      }
      setMessage(`Station "${s.name}" ${!s.active ? "activated" : "deactivated"}.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }

  return (
    <div className="space-y-4">
      <TabGroup
        tabs={mainTabs}
        active={mainTab}
        onChange={(id) => setMainTab(id as typeof mainTab)}
        minHeight="min-h-[36rem]"
      >
        <TabGroup.Panel id="admin" className="space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-600" role="status">
              <Spinner size="sm" />
              Loading users and stations from database…
            </div>
          )}
          {message && (
            <Alert variant="success" onDismiss={() => setMessage(null)}>
              {message}
            </Alert>
          )}
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Visual Statistics Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Card 1: Users Stats */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-500">Active Accounts</span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-250">
                  User Stats
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-zinc-950">
                  {userStats.active}
                </span>
                <span className="text-sm text-zinc-500">/ {userStats.total} active</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-700 transition-all duration-500"
                  style={{ width: `${userStats.total ? (userStats.active / userStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Card 2: Stations Stats */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-500">Active Border Posts</span>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-250">
                  Station Stats
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-zinc-950">
                  {stationStats.active}
                </span>
                <span className="text-sm text-zinc-500">/ {stationStats.total} operational</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-blue-700 transition-all duration-500"
                  style={{ width: `${stationStats.total ? (stationStats.active / stationStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Card 3: System Role Matrix */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-500">Total Administrators</span>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 border border-indigo-250">
                  Access Control
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-zinc-950">
                  {userStats.rolesCount["ADMIN"] || 0}
                </span>
                <span className="text-sm text-zinc-500">admins assigned in system</span>
              </div>
              <div className="mt-3 text-2xs text-zinc-500 truncate font-medium">
                {Object.entries(userStats.rolesCount)
                  .filter(([role]) => role !== "ADMIN")
                  .map(([role, count]) => `${role}: ${count}`)
                  .join(" | ")}
              </div>
            </div>
          </div>

          <TabGroup
            tabs={subTabs}
            active={tab}
            onChange={(id) => setTab(id as typeof tab)}
            minHeight="min-h-[28rem]"
          >
            <TabGroup.Panel id="users">
              {loading ? (
                <TableSkeleton rows={8} cols={4} />
              ) : (
                <div className="grid gap-6 lg:grid-cols-12 items-start">
                  
                  {/* Left Column: ELEVATED User Creation/Edit Form Card (lg:col-span-4) */}
                  <div className={cn(
                    "lg:col-span-4 rounded-xl border border-zinc-200 bg-white shadow-md transition-all duration-300",
                    editingUserId ? "ring-2 ring-amber-500/30 border-amber-300" : ""
                  )}>
                    <div className={cn(
                      "p-4 rounded-t-xl border-b border-zinc-200",
                      editingUserId ? "bg-amber-50/50" : "bg-zinc-50"
                    )}>
                      <h3 className="font-bold text-zinc-950 flex items-center gap-2">
                        {editingUserId ? (
                          <>
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                            Edit User Account
                          </>
                        ) : (
                          <>
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-700" />
                            Create User Account
                          </>
                        )}
                      </h3>
                      {editingUserId && (
                        <p className="text-xs text-amber-800 mt-1">
                          Modifying credentials for <span className="font-semibold">{userForm.username}</span>
                        </p>
                      )}
                    </div>
                    
                    <form onSubmit={saveUser} className="p-5 space-y-5">
                      <Field label="Username" hint={editingUserId ? "Cannot be changed" : "At least 3 characters"}>
                        <input
                          required
                          disabled={!!editingUserId}
                          className={inputClassName}
                          placeholder="e.g. j.doe"
                          value={userForm.username}
                          onChange={(e) =>
                            setUserForm({ ...userForm, username: e.target.value })
                          }
                        />
                      </Field>

                      <Field label="Full Name">
                        <input
                          required
                          className={inputClassName}
                          placeholder="e.g. John Doe"
                          value={userForm.fullName}
                          onChange={(e) =>
                            setUserForm({ ...userForm, fullName: e.target.value })
                          }
                        />
                      </Field>

                      <Field label="Email Address" hint="Optional">
                        <input
                          type="email"
                          className={inputClassName}
                          placeholder="e.g. john.doe@esitrep.local"
                          value={userForm.email}
                          onChange={(e) =>
                            setUserForm({ ...userForm, email: e.target.value })
                          }
                        />
                      </Field>

                      <Field 
                        label={editingUserId ? "New Password" : "Password"} 
                        hint={editingUserId ? "Leave blank to keep current password" : "At least 8 characters"}
                      >
                        <input
                          type="password"
                          className={inputClassName}
                          placeholder="••••••••"
                          value={userForm.password}
                          onChange={(e) =>
                            setUserForm({ ...userForm, password: e.target.value })
                          }
                        />
                      </Field>

                      {needsStation && (
                        <Field label="Assigned Station">
                          <select
                            required
                            className={inputClassName}
                            value={userForm.stationId}
                            onChange={(e) =>
                              setUserForm({ ...userForm, stationId: e.target.value })
                            }
                          >
                            <option value="">Select a border station...</option>
                            {stations.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-900 block">System Roles</label>
                        <div className="grid gap-2">
                          {ASSIGNABLE_ROLES.map((r) => {
                            const isChecked = userForm.roleNames.includes(r.name);
                            return (
                              <label
                                key={r.name}
                                className={cn(
                                  "flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition hover:bg-zinc-50",
                                  isChecked ? "border-emerald-700 bg-emerald-50/20" : "border-zinc-200"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 rounded text-emerald-800 focus:ring-emerald-700"
                                  checked={isChecked}
                                  onChange={() => toggleRole(r.name)}
                                />
                                <div>
                                  <span className="font-semibold text-sm text-zinc-950">{r.name}</span>
                                  <span className="block text-xs text-zinc-500 mt-0.5">
                                    {menusForRoles([r.name]).join(", ")}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="rounded text-emerald-800 focus:ring-emerald-700"
                          checked={userForm.isActive}
                          onChange={(e) =>
                            setUserForm({ ...userForm, isActive: e.target.checked })
                          }
                        />
                        <span className="font-semibold text-zinc-900">Active account (can log in)</span>
                      </label>

                      <div className="flex gap-2.5 pt-2">
                        <Button type="submit" variant={editingUserId ? "secondary" : "primary"} className="flex-1">
                          {editingUserId ? "Update User" : "Create User"}
                        </Button>
                        {editingUserId && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setEditingUserId(null);
                              setUserForm(emptyUserForm());
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Right Column: Searchable, Filterable User Table List (lg:col-span-8) */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Search & Filters Card */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Search by name, username, email..."
                            className={inputClassName}
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                        </div>
                        <div>
                          <select
                            className={inputClassName}
                            value={userStatusFilter}
                            onChange={(e) => setUserStatusFilter(e.target.value)}
                          >
                            <option value="all">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                          </select>
                        </div>
                        <div>
                          <select
                            className={inputClassName}
                            value={userRoleFilter}
                            onChange={(e) => setUserRoleFilter(e.target.value)}
                          >
                            <option value="all">All Roles</option>
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r.name} value={r.name}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Table Container Card */}
                    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                      <div className="max-h-[36rem] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                            <tr>
                              <th className="p-4 text-left font-bold text-zinc-800">User Identity</th>
                              <th className="p-4 text-left font-bold text-zinc-800">Border Post</th>
                              <th className="p-4 text-left font-bold text-zinc-800">System Roles</th>
                              <th className="p-4 text-right font-bold text-zinc-800">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {filteredUsers.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-zinc-500">
                                  No users found matching current filters.
                                </td>
                              </tr>
                            ) : (
                              filteredUsers.map((u) => {
                                return (
                                  <tr key={u.id} className={cn(
                                    "transition hover:bg-zinc-50/50",
                                    !u.isActive && "bg-zinc-50/60 opacity-80"
                                  )}>
                                    <td className="p-4">
                                      <div className="flex items-center gap-2.5">
                                        <p className="font-semibold text-zinc-950">{u.fullName}</p>
                                        {!u.isActive && (
                                          <span className="inline-flex items-center rounded-full bg-zinc-150 border border-zinc-300 px-2 py-0.5 text-xs font-semibold text-zinc-800">
                                            Inactive
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{u.username}</p>
                                    </td>
                                    <td className="p-4 text-zinc-700 font-medium">
                                      {u.station?.name ? (
                                        <span className="inline-flex items-center gap-1.5">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                          {u.station.name}
                                        </span>
                                      ) : (
                                        <span className="text-zinc-400">—</span>
                                      )}
                                    </td>
                                    <td className="p-4">
                                      <div className="flex flex-wrap gap-1">
                                        {u.roles.map((role) => {
                                          const isAdm = role === "ADMIN";
                                          const isHq = role.startsWith("HQ_");
                                          const isInput = role === "STATION_INPUTTER";
                                          return (
                                            <span
                                              key={role}
                                              className={cn(
                                                "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold border",
                                                isAdm && "bg-indigo-50 border-indigo-200 text-indigo-800",
                                                isHq && "bg-amber-50 border-amber-200 text-amber-800",
                                                isInput && "bg-emerald-50 border-emerald-200 text-emerald-800",
                                                !isAdm && !isHq && !isInput && "bg-sky-50 border-sky-200 text-sky-800"
                                              )}
                                            >
                                              {role}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td className="p-4 text-right">
                                      <div className="flex items-center justify-end gap-2.5">
                                        <button
                                          type="button"
                                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 transition bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded"
                                          onClick={() => editUser(u)}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          className={cn(
                                            "text-xs font-bold transition border px-2.5 py-1 rounded",
                                            u.isActive
                                              ? "text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border-amber-200"
                                              : "text-blue-800 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                          )}
                                          onClick={() => toggleUserActive(u)}
                                        >
                                          {u.isActive ? "Deactivate" : "Activate"}
                                        </button>
                                        <button
                                          type="button"
                                          className="text-xs font-bold text-rose-700 hover:text-rose-900 transition bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded"
                                          onClick={() => deleteUser(u)}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </TabGroup.Panel>

            <TabGroup.Panel id="stations">
              {loading ? (
                <TableSkeleton rows={10} cols={4} />
              ) : (
                <div className="grid gap-6 lg:grid-cols-12 items-start">
                  
                  {/* Left Column: ELEVATED Station Creation/Edit Form Card (lg:col-span-4) */}
                  <div className={cn(
                    "lg:col-span-4 rounded-xl border border-zinc-200 bg-white shadow-md transition-all duration-300",
                    editingStationId ? "ring-2 ring-amber-500/30 border-amber-300" : ""
                  )}>
                    <div className={cn(
                      "p-4 rounded-t-xl border-b border-zinc-200",
                      editingStationId ? "bg-amber-50/50" : "bg-zinc-50"
                    )}>
                      <h3 className="font-bold text-zinc-950 flex items-center gap-2">
                        {editingStationId ? (
                          <>
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                            Edit Border Post
                          </>
                        ) : (
                          <>
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-700" />
                            Create Border Post
                          </>
                        )}
                      </h3>
                      {editingStationId && (
                        <p className="text-xs text-amber-800 mt-1">
                          Modifying station: <span className="font-semibold">{stationForm.name}</span>
                        </p>
                      )}
                    </div>
                    
                    <form onSubmit={saveStation} className="p-5 space-y-5">
                      <Field label="Station Code" hint="Max 20 characters, e.g. ELA, ENT">
                        <input
                          required
                          disabled={!!editingStationId}
                          className={inputClassName}
                          placeholder="e.g. BB1"
                          value={stationForm.code}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, code: e.target.value })
                          }
                        />
                      </Field>

                      <Field label="Station Name" hint="Official government designation">
                        <input
                          required
                          className={inputClassName}
                          placeholder="e.g. BIBIA POST"
                          value={stationForm.name}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, name: e.target.value })
                          }
                        />
                      </Field>

                      <Field label="Regional Cluster" hint="Optional, e.g. Northern, Eastern">
                        <input
                          className={inputClassName}
                          placeholder="e.g. Northern"
                          value={stationForm.cluster}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, cluster: e.target.value })
                          }
                        />
                      </Field>

                      <Field label="Entry Point Type" hint="e.g. Land, Air, Water">
                        <input
                          className={inputClassName}
                          placeholder="e.g. Land"
                          value={stationForm.type}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, type: e.target.value })
                          }
                        />
                      </Field>

                      <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="rounded text-emerald-800 focus:ring-emerald-700"
                          checked={stationForm.active}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, active: e.target.checked })
                          }
                        />
                        <span className="font-semibold text-zinc-900">Active operational post</span>
                      </label>

                      <div className="flex gap-2.5 pt-2">
                        <Button type="submit" variant={editingStationId ? "secondary" : "primary"} className="flex-1">
                          {editingStationId ? "Update Station" : "Create Station"}
                        </Button>
                        {editingStationId && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setEditingStationId(null);
                              setStationForm({
                                code: "",
                                name: "",
                                cluster: "",
                                type: "",
                                location: "",
                                active: true,
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Right Column: Searchable, Filterable Station Table List (lg:col-span-8) */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Search & Filters Card */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                          <input
                            type="text"
                            placeholder="Search by name, code..."
                            className={inputClassName}
                            value={stationSearch}
                            onChange={(e) => setStationSearch(e.target.value)}
                          />
                        </div>
                        <div>
                          <select
                            className={inputClassName}
                            value={stationStatusFilter}
                            onChange={(e) => setStationStatusFilter(e.target.value)}
                          >
                            <option value="all">All Operational States</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                          </select>
                        </div>
                        <div>
                          <select
                            className={inputClassName}
                            value={stationClusterFilter}
                            onChange={(e) => setStationClusterFilter(e.target.value)}
                          >
                            <option value="all">All Clusters</option>
                            {uniqueClusters.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Table Container Card */}
                    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                      <div className="max-h-[36rem] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                            <tr>
                              <th className="p-4 text-left font-bold text-zinc-800">Station Code / Name</th>
                              <th className="p-4 text-left font-bold text-zinc-800">Cluster</th>
                              <th className="p-4 text-left font-bold text-zinc-800">Active Staff</th>
                              <th className="p-4 text-right font-bold text-zinc-800">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {filteredStations.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-zinc-500">
                                  No border stations found matching current filters.
                                </td>
                              </tr>
                            ) : (
                              filteredStations.map((s) => {
                                return (
                                  <tr key={s.id} className={cn(
                                    "transition hover:bg-zinc-50/50",
                                    !s.active && "bg-zinc-50/60 opacity-80"
                                  )}>
                                    <td className="p-4">
                                      <div className="flex items-center gap-2.5">
                                        <p className="font-semibold text-zinc-950">{s.name}</p>
                                        {!s.active && (
                                          <span className="inline-flex items-center rounded-full bg-zinc-150 border border-zinc-300 px-2 py-0.5 text-xs font-semibold text-zinc-800">
                                            Inactive
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{s.code} • {s.type ?? "Land"}</p>
                                    </td>
                                    <td className="p-4 text-zinc-700 font-medium">
                                      {s.cluster ? (
                                        <span className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded text-xs">
                                          {s.cluster}
                                        </span>
                                      ) : (
                                        <span className="text-zinc-400">—</span>
                                      )}
                                    </td>
                                    <td className="p-4 text-zinc-600">
                                      <span className="font-semibold text-zinc-800">{s.userCount}</span> assigned users
                                    </td>
                                    <td className="p-4 text-right">
                                      <div className="flex items-center justify-end gap-2.5">
                                        <button
                                          type="button"
                                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 transition bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded"
                                          onClick={() => editStation(s)}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          className={cn(
                                            "text-xs font-bold transition border px-2.5 py-1 rounded",
                                            s.active
                                              ? "text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border-amber-200"
                                              : "text-blue-800 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                          )}
                                          onClick={() => toggleStationActive(s)}
                                        >
                                          {s.active ? "Deactivate" : "Activate"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </TabGroup.Panel>
          </TabGroup>
        </TabGroup.Panel>

        <TabGroup.Panel id="reports" className="border-0 p-0 shadow-none">
          <AdminReportsPanel />
        </TabGroup.Panel>
      </TabGroup>
    </div>
  );
}
