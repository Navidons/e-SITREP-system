"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TabGroup } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { AdminReportsPanel } from "@/components/admin/AdminReportsPanel";
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

  return (
    <div className="space-y-4">
      <TabGroup
        tabs={mainTabs}
        active={mainTab}
        onChange={(id) => setMainTab(id as typeof mainTab)}
        minHeight="min-h-[36rem]"
      >
        <TabGroup.Panel id="admin" className="space-y-4">
          {loading && (
            <p className="text-sm text-zinc-600" role="status">
              Loading users and stations…
            </p>
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

          <TabGroup
            tabs={subTabs}
            active={tab}
            onChange={(id) => setTab(id as typeof tab)}
            minHeight="min-h-[28rem]"
          >
            <TabGroup.Panel id="users">
              <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
                <form onSubmit={saveUser} className="border-b border-zinc-200 p-4 space-y-4">
                  <h3 className="font-semibold text-zinc-900">
                    {editingUserId ? "Edit user" : "New user"}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      Username
                      <input
                        required
                        disabled={!!editingUserId}
                        className="mt-1 w-full rounded border border-zinc-400 px-3 py-2 disabled:bg-zinc-100"
                        value={userForm.username}
                        onChange={(e) =>
                          setUserForm({ ...userForm, username: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Full name
                      <input
                        required
                        className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                        value={userForm.fullName}
                        onChange={(e) =>
                          setUserForm({ ...userForm, fullName: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Email
                      <input
                        type="email"
                        className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                        value={userForm.email}
                        onChange={(e) =>
                          setUserForm({ ...userForm, email: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      {editingUserId ? "New password (optional)" : "Password"}
                      <input
                        type="password"
                        className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm({ ...userForm, password: e.target.value })
                        }
                      />
                    </label>
                    {needsStation && (
                      <label className="block text-sm sm:col-span-2">
                        Station
                        <select
                          required
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
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
                  <fieldset>
                    <legend className="text-sm font-semibold">Roles</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {ASSIGNABLE_ROLES.map((r) => (
                        <label
                          key={r.name}
                          className="flex cursor-pointer gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50"
                        >
                          <input
                            type="checkbox"
                            checked={userForm.roleNames.includes(r.name)}
                            onChange={() => toggleRole(r.name)}
                          />
                          <span>
                            <span className="font-semibold text-sm">{r.name}</span>
                            <span className="block text-xs text-zinc-600">
                              {menusForRoles([r.name]).join(", ")}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={userForm.isActive}
                      onChange={(e) =>
                        setUserForm({ ...userForm, isActive: e.target.checked })
                      }
                    />
                    Active account
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingUserId ? "Update user" : "Create user"}
                    </Button>
                    {editingUserId && (
                      <Button
                        type="button"
                        variant="secondary"
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
                <div className="max-h-[32rem] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 sticky top-0">
                      <tr>
                        <th className="p-3 text-left">User</th>
                        <th className="p-3 text-left">Station</th>
                        <th className="p-3 text-left">Roles</th>
                        <th className="p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-zinc-100">
                          <td className="p-3">
                            <p className="font-semibold">{u.fullName}</p>
                            <p className="text-xs text-zinc-600">{u.username}</p>
                          </td>
                          <td className="p-3">{u.station?.name ?? "—"}</td>
                          <td className="p-3 text-xs">{u.roles.join(", ")}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              className="text-sm font-semibold text-emerald-800"
                              onClick={() => editUser(u)}
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
            </TabGroup.Panel>

            <TabGroup.Panel id="stations">
              <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
                <form
                  onSubmit={saveStation}
                  className="border-b border-zinc-200 p-4 space-y-4"
                >
                  <h3 className="font-semibold text-zinc-900">
                    {editingStationId ? "Edit station" : "New station"}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      Code
                      <input
                        required
                        className="mt-1 w-full rounded border border-zinc-400 px-3 py-2 uppercase"
                        value={stationForm.code}
                        onChange={(e) =>
                          setStationForm({ ...stationForm, code: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Name
                      <input
                        required
                        className="mt-1 w-full rounded border border-zinc-400 px-3 py-2 uppercase"
                        value={stationForm.name}
                        onChange={(e) =>
                          setStationForm({ ...stationForm, name: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Cluster
                      <input
                        className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                        value={stationForm.cluster}
                        onChange={(e) =>
                          setStationForm({ ...stationForm, cluster: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Type
                      <input
                        className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                        placeholder="Land / Air"
                        value={stationForm.type}
                        onChange={(e) =>
                          setStationForm({ ...stationForm, type: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingStationId ? "Update station" : "Create station"}
                    </Button>
                    {editingStationId && (
                      <Button
                        type="button"
                        variant="secondary"
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
                <div className="max-h-[32rem] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 sticky top-0">
                      <tr>
                        <th className="p-3 text-left">Station</th>
                        <th className="p-3 text-left">Cluster</th>
                        <th className="p-3 text-left">Users</th>
                        <th className="p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {stationRows.map((s) => (
                        <tr key={s.id} className="border-t border-zinc-100">
                          <td className="p-3 font-semibold">{s.name}</td>
                          <td className="p-3">{s.cluster ?? "—"}</td>
                          <td className="p-3">{s.userCount}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              className="text-sm font-semibold text-emerald-800"
                              onClick={() => editStation(s)}
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
