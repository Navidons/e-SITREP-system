"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { AdminReportsPanel } from "@/components/admin/AdminReportsPanel";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle,
  Plus,
  Edit,
  UserPlus,
  Users,
  Settings2,
  Building2,
  Compass,
  Check,
  X,
  XCircle,
} from "lucide-react";
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
    setMessage(editingUserId ? "User account updated successfully." : "User account created successfully.");
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
    setMessage(editingStationId ? "Border station updated successfully." : "Border station created successfully.");
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

  return (
    <div className="space-y-5">
      <Tabs
        tabs={mainTabs}
        active={mainTab}
        onChange={(id) => setMainTab(id as typeof mainTab)}
        className="rounded-lg shadow-sm border border-zinc-200"
      />

      {/* Reports & SITREP Persistent Panel */}
      <div className={cn(mainTab !== "reports" && "hidden")}>
        <TabPanel>
          <AdminReportsPanel />
        </TabPanel>
      </div>

      {/* Users & Stations Persistent Panel */}
      <div className={cn(mainTab !== "admin" && "hidden")}>
        <TabPanel className="space-y-6">
          {message && (
            <div className="flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950 shadow-sm">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-950 shadow-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <Tabs tabs={subTabs} active={tab} onChange={(id) => setTab(id as typeof tab)} />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
              <p className="text-sm font-semibold text-zinc-500">Loading console data…</p>
            </div>
          ) : (
            <>
              {/* Users Subtab Persistent Panel */}
              <div className={cn(tab !== "users" && "hidden")}>
                <div className="overflow-hidden rounded-xl border border-zinc-250 bg-white shadow-md">
                  <form onSubmit={saveUser} className="border-b border-zinc-200 bg-zinc-50/50 p-6 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                        <UserPlus className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="font-bold text-zinc-900 tracking-tight">
                        {editingUserId ? "Edit User Account" : "Register New User Account"}
                      </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                        Username
                        <input
                          required
                          disabled={!!editingUserId}
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                          value={userForm.username}
                          onChange={(e) =>
                            setUserForm({ ...userForm, username: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                        Full Name
                        <input
                          required
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={userForm.fullName}
                          onChange={(e) =>
                            setUserForm({ ...userForm, fullName: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                        Email Address
                        <input
                          type="email"
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={userForm.email}
                          onChange={(e) =>
                            setUserForm({ ...userForm, email: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                        {editingUserId ? "New Password (optional)" : "Password"}
                        <input
                          type="password"
                          required={!editingUserId}
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={userForm.password}
                          onChange={(e) =>
                            setUserForm({ ...userForm, password: e.target.value })
                          }
                        />
                      </label>
                      {needsStation && (
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655 sm:col-span-2">
                          Assigned Border Station
                          <select
                            required
                            className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                            value={userForm.stationId}
                            onChange={(e) =>
                              setUserForm({ ...userForm, stationId: e.target.value })
                            }
                          >
                            <option value="">Select station</option>
                            {stations.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>

                    <fieldset className="space-y-2">
                      <legend className="text-xs font-bold uppercase tracking-wider text-zinc-600">Access Roles & Menus</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {ASSIGNABLE_ROLES.map((r) => {
                          const isSelected = userForm.roleNames.includes(r.name);
                          return (
                            <label
                              key={r.name}
                              className={cn(
                                "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all active:scale-[0.99]",
                                isSelected
                                  ? "border-emerald-800 bg-emerald-50/30 ring-1 ring-emerald-800"
                                  : "border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300",
                              )}
                            >
                              <input
                                type="checkbox"
                                className="mt-1 rounded text-emerald-800 focus:ring-emerald-800"
                                checked={isSelected}
                                onChange={() => toggleRole(r.name)}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-zinc-900 leading-none">{r.name}</span>
                                <span className="mt-1.5 text-xxs font-semibold uppercase tracking-wider text-zinc-500">
                                  Access: {menusForRoles([r.name]).join(" · ")}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        id="user-active"
                        className="rounded text-emerald-850 focus:ring-emerald-800"
                        checked={userForm.isActive}
                        onChange={(e) =>
                          setUserForm({ ...userForm, isActive: e.target.checked })
                        }
                      />
                      <label htmlFor="user-active" className="cursor-pointer text-zinc-800">
                        Active Account (allows login access)
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-2 border-t border-zinc-200">
                      <Button 
                        type="submit" 
                        className="rounded-lg font-bold py-2.5 px-6 shadow-sm active:scale-[0.98] transition-all bg-emerald-800 text-white hover:bg-emerald-900 cursor-pointer"
                      >
                        {editingUserId ? "Update Account Details" : "Register User Account"}
                      </Button>
                      {editingUserId && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-lg shadow-sm hover:bg-zinc-100 transition-all font-bold cursor-pointer"
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

                  {/* Users List Table */}
                  <div className="max-h-[32rem] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-200 shadow-sm z-10">
                        <tr className="text-left">
                          <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">User Profile</th>
                          <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Assigned Station</th>
                          <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Access Roles</th>
                          <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Status</th>
                          <th className="p-3.5 w-16" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-zinc-50/50 transition">
                            <td className="p-3.5">
                              <p className="font-bold text-zinc-950">{u.fullName}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">@{u.username}</p>
                            </td>
                            <td className="p-3.5 text-zinc-700 font-semibold">
                              {u.station?.name ?? <span className="text-zinc-400 font-normal">—</span>}
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1">
                                {u.roles.map(r => (
                                  <span key={r} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xxs font-extrabold text-zinc-650 uppercase tracking-wide border border-zinc-200">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3.5">
                              {u.isActive ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                  <Check className="h-3 w-3 shrink-0" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                  <X className="h-3 w-3 shrink-0" />
                                  Suspended
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <button
                                type="button"
                                className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer flex items-center gap-1.5"
                                onClick={() => editUser(u)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Stations Subtab Persistent Panel */}
              <div className={cn(tab !== "stations" && "hidden")}>
                <div className="overflow-hidden rounded-xl border border-zinc-250 bg-white shadow-md">
                  <form
                    onSubmit={saveStation}
                    className="border-b border-zinc-200 bg-zinc-50/50 p-6 space-y-6"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                        <Building2 className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="font-bold text-zinc-900 tracking-tight">
                        {editingStationId ? "Edit Border Station" : "Register New Border Station"}
                      </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                        Station Code
                        <input
                          required
                          placeholder="e.g. BUS"
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none uppercase"
                          value={stationForm.code}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, code: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                        Station Name
                        <input
                          required
                          placeholder="e.g. BUSIA"
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none uppercase"
                          value={stationForm.name}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, name: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                        Regional Cluster
                        <input
                          placeholder="e.g. Eastern"
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={stationForm.cluster}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, cluster: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                        Station Type
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          placeholder="Land / Air"
                          value={stationForm.type}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, type: e.target.value })
                          }
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        id="station-active"
                        className="rounded text-emerald-850 focus:ring-emerald-800"
                        checked={stationForm.active}
                        onChange={(e) =>
                          setStationForm({ ...stationForm, active: e.target.checked })
                        }
                      />
                      <label htmlFor="station-active" className="cursor-pointer text-zinc-800">
                        Active Station (allows daily reporting)
                      </label>
                    </div>

                    <div className="flex gap-2.5 pt-2 border-t border-zinc-200">
                      <Button 
                        type="submit"
                        className="rounded-lg font-bold py-2.5 px-6 shadow-sm active:scale-[0.98] transition-all bg-emerald-800 text-white hover:bg-emerald-900 cursor-pointer"
                      >
                        {editingStationId ? "Update Station" : "Register Station"}
                      </Button>
                      {editingStationId && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-lg shadow-sm hover:bg-zinc-100 transition-all font-bold cursor-pointer"
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

                  {/* Stations List Table */}
                  <div className="max-h-[32rem] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-200 shadow-sm z-10">
                        <tr className="text-left">
                          <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Border Station</th>
                          <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Cluster</th>
                          <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Type</th>
                          <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Registered Users</th>
                          <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Status</th>
                          <th className="p-3.5 w-16" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {stationRows.map((s) => (
                          <tr key={s.id} className="hover:bg-zinc-50/50 transition">
                            <td className="p-3.5">
                              <p className="font-bold text-zinc-950">{s.name}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">Code: {s.code}</p>
                            </td>
                            <td className="p-3.5 text-zinc-700 font-semibold">{s.cluster ?? <span className="text-zinc-400 font-normal">—</span>}</td>
                            <td className="p-3.5 text-zinc-750 font-medium">
                              {s.type ? (
                                <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-850 border border-sky-100">
                                  {s.type}
                                </span>
                              ) : (
                                <span className="text-zinc-400 font-normal">—</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                <Users className="h-3 w-3 text-zinc-500" />
                                {s.userCount} active users
                              </span>
                            </td>
                            <td className="p-3.5">
                              {s.active ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                  <Check className="h-3 w-3 shrink-0" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                  <X className="h-3 w-3 shrink-0" />
                                  Deactivated
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <button
                                type="button"
                                className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer flex items-center gap-1.5"
                                onClick={() => editStation(s)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabPanel>
      </div>
    </div>
  );
}
