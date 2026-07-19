"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ShieldCheck, ArrowLeft, Activity } from "lucide-react";
import clsx from "clsx";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/api/v1/users", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();

    // Connect to WebSocket for real-time feed
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/intel/ws";
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === "NEW_USER") {
          const newUser = {
            id: payload.id,
            name: payload.name,
            email: payload.email,
            role: payload.role,
            status: payload.status,
            createdAt: payload.createdAt,
          };
          setUsers((prev) => [newUser, ...prev]);
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed on Users page.");
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/network" className="p-2 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnel Management</h1>
          <p className="text-sm text-zinc-500 font-mono tracking-widest mt-1 uppercase">Platform Administration</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Activity size={32} className="text-[#34d399] animate-spin mx-auto mb-4" />
          <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase animate-pulse">Loading Officers...</p>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 border-b border-white/5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-bold">Name</th>
                <th className="px-6 py-4 font-bold">Email</th>
                <th className="px-6 py-4 font-bold">Role</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-mono text-sm">
                    No users found.
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {user.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-2 py-1 rounded-md text-[10px] font-bold tracking-widest font-mono uppercase", 
                      user.role === "PLATFORM_ADMIN" ? "bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                    )}>
                      {user.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-2 py-1 rounded-md text-[10px] font-bold tracking-widest font-mono uppercase",
                      user.status === "APPROVED" ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
