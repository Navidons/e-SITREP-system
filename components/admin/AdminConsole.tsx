"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import {
  ASSIGNABLE_ROLES,
  menusForRoles,
  roleNeedsStation,
} from "@/lib/admin/navigation";
import { cn } from "@/lib/utils";

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
      setStations(meta.stations ?? []);
      setUsers(usersJson.users ?? []);
      setStationRows(stationsJson.stations ?? []);
    } catch {
      setError("Could not load administration data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const previewMenus = useMemo(
    () => menusForRoles(userForm.roleNames),
    [userForm.roleNames],
  );

  const stationRequired = roleNeedsStation(userForm.roleNames);

  function resetUserForm() {
    setUserForm(emptyUserForm());
    setEditingUserId(null);
  }

  function startEditUser(u: UserRow) {
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
    setTab("users");
  }

  function toggleRole(roleName: string) {
    setUserForm((f) => ({
      ...f,
      roleNames: f.roleNames.includes(roleName)
        ? f.roleNames.filter((r) => r !== roleName)
        : [...f.roleNames, roleName],
    }));
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const payload = {
      fullName: userForm.fullName,
      email: userForm.email || null,
      stationId:
        userForm.stationId === "" ? null : Number(userForm.stationId),
      roleNames: userForm.roleNames,
      isActive: userForm.isActive,
      ...(userForm.password ? { password: userForm.password } : {}),
    };

    const res = editingUserId
      ? await fetch(`/api/admin/users/${editingUserId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            username: userForm.username,
            password: userForm.password,
          }),
        });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Save failed");
      return;
    }
    setUsers(json.users ?? []);
    setMessage(editingUserId ? "User updated." : "User created.");
    resetUserForm();
  }

  function resetStationForm() {
    setStationForm({
      code: "",
      name: "",
      cluster: "",
      type: "",
      location: "",
      active: true,
    });
    setEditingStationId(null);
  }

  function startEditStation(s: StationRow) {
    setEditingStationId(s.id);
    setStationForm({
      code: s.code,
      name: s.name,
      cluster: s.cluster ?? "",
      type: s.type ?? "",
      location: s.location ?? "",
      active: s.active,
    });
    setTab("stations");
  }

  async function saveStation(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const res = editingStationId
      ? await fetch(`/api/admin/stations/${editingStationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: stationForm.name,
            cluster: stationForm.cluster || null,
            type: stationForm.type || null,
            location: stationForm.location || null,
            active: stationForm.active,
          }),
        })
      : await fetch("/api/admin/stations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stationForm),
        });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Save failed");
      return;
    }
    setStationRows(json.stations ?? []);
    const metaRes = await fetch("/api/admin/meta");
    if (metaRes.ok) {
      const meta = await metaRes.json();
      setStations(meta.stations ?? []);
    }
    setMessage(editingStationId ? "Station updated." : "Station created.");
    resetStationForm();
  }

  const tabs = [
    { id: "users", label: "Users" },
    { id: "stations", label: "Stations" },
  ];

  return (
    <div className="space-y-4">
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-950">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
        <Tabs
          tabs={tabs}
          active={tab}
          onChange={(id) => setTab(id as "users" | "stations")}
        />

        {tab === "users" && (
          <TabPanel>
            <div className="grid gap-6 lg:grid-cols-2">
              <form onSubmit={saveUser} className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {editingUserId ? "Edit user" : "New user"}
                </h2>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-900">
                    Username
                  </label>
                  <input
                    className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900 disabled:bg-zinc-100"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, username: e.target.value }))
                    }
                    disabled={!!editingUserId}
                    required={!editingUserId}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-900">
                    Full name
                  </label>
                  <input
                    className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                    value={userForm.fullName}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, fullName: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-900">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-900">
                    {editingUserId ? "New password (optional)" : "Password"}
                  </label>
                  <input
                    type="password"
                    className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, password: e.target.value }))
                    }
                    required={!editingUserId}
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-900">
                    Border station
                  </label>
                  <select
                    className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                    value={userForm.stationId}
                    onChange={(e) =>
                      setUserForm((f) => ({
                        ...f,
                        stationId: e.target.value,
                      }))
                    }
                    required={stationRequired}
                  >
                    <option value="">
                      {stationRequired
                        ? "Select station…"
                        : "None (HQ / admin)"}
                    </option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                        {!s.active ? " — inactive" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-zinc-600">
                    Required for station inputter and cluster supervisor.
                  </p>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-zinc-900">
                    Roles & access
                  </legend>
                  <div className="space-y-2">
                    {ASSIGNABLE_ROLES.map((r) => (
                      <label
                        key={r.name}
                        className="flex cursor-pointer gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50"
                      >
                        <input
                          type="checkbox"
                          checked={userForm.roleNames.includes(r.name)}
                          onChange={() => toggleRole(r.name)}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-semibold text-zinc-900">
                            {r.label}
                          </span>
                          <span className="block text-xs text-zinc-600">
                            {r.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {previewMenus.length > 0 && (
                  <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
                    <span className="font-semibold">Menus they will see: </span>
                    {previewMenus.join(" · ")}
                  </div>
                )}

                {editingUserId && (
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                    <input
                      type="checkbox"
                      checked={userForm.isActive}
                      onChange={(e) =>
                        setUserForm((f) => ({
                          ...f,
                          isActive: e.target.checked,
                        }))
                      }
                    />
                    Account active
                  </label>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {editingUserId ? "Update user" : "Create user"}
                  </Button>
                  {editingUserId && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetUserForm}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>

              <div className="min-h-0">
                <h2 className="mb-3 text-lg font-semibold text-zinc-900">
                  All users ({users.length})
                </h2>
                <div className="max-h-[32rem] overflow-y-auto rounded border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-zinc-100 text-xs uppercase text-zinc-600">
                      <tr>
                        <th className="p-2">User</th>
                        <th className="p-2">Station</th>
                        <th className="p-2">Roles</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className={cn(
                            "border-t border-zinc-100",
                            !u.isActive && "opacity-60",
                          )}
                        >
                          <td className="p-2">
                            <p className="font-semibold text-zinc-900">
                              {u.fullName}
                            </p>
                            <p className="text-xs text-zinc-600">
                              {u.username}
                            </p>
                          </td>
                          <td className="p-2 text-zinc-700">
                            {u.station
                              ? `${u.station.name}`
                              : "—"}
                          </td>
                          <td className="p-2 text-xs text-zinc-700">
                            {u.roles.join(", ")}
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              className="text-sm font-semibold text-emerald-800 hover:underline"
                              onClick={() => startEditUser(u)}
                            >
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
          </TabPanel>
        )}

        {tab === "stations" && (
          <TabPanel>
            <div className="grid gap-6 lg:grid-cols-2">
              <form onSubmit={saveStation} className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {editingStationId ? "Edit station" : "New station"}
                </h2>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-900">
                    Code
                  </label>
                  <input
                    className="w-full rounded border border-zinc-400 px-3 py-2 uppercase text-zinc-900 disabled:bg-zinc-100"
                    value={stationForm.code}
                    onChange={(e) =>
                      setStationForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    disabled={!!editingStationId}
                    required={!editingStationId}
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-900">
                    Name
                  </label>
                  <input
                    className="w-full rounded border border-zinc-400 px-3 py-2 uppercase text-zinc-900"
                    value={stationForm.name}
                    onChange={(e) =>
                      setStationForm((f) => ({
                        ...f,
                        name: e.target.value.toUpperCase(),
                      }))
                    }
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-900">
                      Cluster
                    </label>
                    <input
                      className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                      value={stationForm.cluster}
                      onChange={(e) =>
                        setStationForm((f) => ({
                          ...f,
                          cluster: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-900">
                      Type
                    </label>
                    <select
                      className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                      value={stationForm.type}
                      onChange={(e) =>
                        setStationForm((f) => ({ ...f, type: e.target.value }))
                      }
                    >
                      <option value="">Select…</option>
                      <option value="Land">Land</option>
                      <option value="Air">Air</option>
                      <option value="Water">Water</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-900">
                    Location (optional)
                  </label>
                  <input
                    className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                    value={stationForm.location}
                    onChange={(e) =>
                      setStationForm((f) => ({
                        ...f,
                        location: e.target.value,
                      }))
                    }
                  />
                </div>

                {editingStationId && (
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                    <input
                      type="checkbox"
                      checked={stationForm.active}
                      onChange={(e) =>
                        setStationForm((f) => ({
                          ...f,
                          active: e.target.checked,
                        }))
                      }
                    />
                    Station active
                  </label>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {editingStationId ? "Update station" : "Create station"}
                  </Button>
                  {editingStationId && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetStationForm}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>

              <div>
                <h2 className="mb-3 text-lg font-semibold text-zinc-900">
                  All stations ({stationRows.length})
                </h2>
                <div className="max-h-[32rem] overflow-y-auto rounded border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-zinc-100 text-xs uppercase text-zinc-600">
                      <tr>
                        <th className="p-2">Station</th>
                        <th className="p-2">Cluster</th>
                        <th className="p-2">Users</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {stationRows.map((s) => (
                        <tr
                          key={s.id}
                          className={cn(
                            "border-t border-zinc-100",
                            !s.active && "opacity-60",
                          )}
                        >
                          <td className="p-2">
                            <p className="font-semibold text-zinc-900">
                              {s.name}
                            </p>
                            <p className="text-xs text-zinc-600">{s.code}</p>
                          </td>
                          <td className="p-2 text-zinc-700">
                            {s.cluster ?? "—"} · {s.type ?? "—"}
                          </td>
                          <td className="p-2 tabular-nums">{s.userCount}</td>
                          <td className="p-2">
                            <button
                              type="button"
                              className="text-sm font-semibold text-emerald-800 hover:underline"
                              onClick={() => startEditStation(s)}
                            >
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
          </TabPanel>
        )}
      </div>
    </div>
  );
}
