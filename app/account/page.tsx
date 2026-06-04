"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ROLES = ["operator", "supervisor", "manager", "admin"];

function generatePassword(): string {
  const letters = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits  = "23456789";
  let pwd = "";
  for (let i = 0; i < 2; i++) pwd += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 6; i++) pwd += letters[Math.floor(Math.random() * letters.length)];
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

function generateUsername(fullname: string): string {
  const parts = fullname.trim().split(/\s+/);
  if (parts.length < 2) return parts[0].toLowerCase();
  const firstName = parts[0];
  const lastName  = parts[parts.length - 1];
  return (firstName + lastName.slice(0, 2)).toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<"add" | "manage">("add");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const [fn, setFn] = useState("");
  const [eid, setEid] = useState("");
  const [role, setRole] = useState("operator");
  const [previewUn, setPreviewUn] = useState("");
  const [previewPw, setPreviewPw] = useState("");

  const [editFn, setEditFn] = useState("");
  const [editEid, setEditEid] = useState("");
  const [editUn, setEditUn] = useState("");
  const [editRole, setEditRole] = useState("operator");

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const inputStyle = {
    background: "var(--color-anu-elevated)",
    borderColor: "var(--color-anu-border)",
    color: "var(--color-anu-text)",
  };

  useEffect(() => {
    const stored = localStorage.getItem("anu_user");
    if (!stored) { router.push("/login"); return; }
    const u = JSON.parse(stored);
    if (u.role !== "admin") { router.push("/dashboard"); return; }
    setUser(u);
    loadUsers();
  }, []);

  useEffect(() => {
    setPreviewUn(fn.trim() ? generateUsername(fn) : "");
  }, [fn]);

  useEffect(() => {
    setPreviewPw(generatePassword());
  }, []);

  async function loadUsers() {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("fullname");
    if (error) { showMsg(`❌ โหลดข้อมูลไม่สำเร็จ: ${error.message}`, "error"); return; }
    setUsers(data || []);
  }

  function showMsg(text: string, type: "success" | "error") {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  }

  async function handleAdd() {
    if (!fn.trim()) { showMsg("⚠️ กรุณากรอกชื่อ-นามสกุล", "error"); return; }

    const finalUn = previewUn || generateUsername(fn);
    const finalPw = previewPw || generatePassword();

    const dup = users.find(u => u.username === finalUn);
    if (dup) { showMsg(`❌ Username "${finalUn}" มีในระบบแล้ว`, "error"); return; }

    setSaving(true);
    const { error } = await supabase.from("app_users").insert([{
      fullname:      fn.trim(),
      emp_id:        eid.trim() || null,
      username:      finalUn,
      password_hash: finalPw,
      role,
      first_login:   true,
    }]);

    if (error) { showMsg(`❌ บันทึกไม่สำเร็จ: ${error.message}`, "error"); setSaving(false); return; }

    await loadUsers();
    showMsg(`✅ เพิ่มผู้ใช้ "${fn.trim()}" สำเร็จ  |  Username: ${finalUn}  |  Password: ${finalPw}`, "success");
    setFn(""); setEid(""); setRole("operator");
    setPreviewPw(generatePassword());
    setSaving(false);
  }

  function startEdit(u: any) {
    setEditingUser(u);
    setEditFn(u.fullname ?? "");
    setEditEid(u.emp_id ?? "");
    setEditUn(u.username ?? "");
    setEditRole(u.role ?? "operator");
  }

  async function handleSaveEdit() {
    if (!editFn.trim() || !editUn.trim()) { showMsg("⚠️ ชื่อและ Username ห้ามว่าง", "error"); return; }
    const dup = users.find(u => u.username === editUn.trim() && u.id !== editingUser.id);
    if (dup) { showMsg("❌ Username นี้มีคนอื่นใช้แล้ว", "error"); return; }

    setSaving(true);
    const { error } = await supabase.from("app_users").update({
      fullname: editFn.trim(),
      emp_id:   editEid.trim() || null,
      username: editUn.trim(),
      role:     editRole,
    }).eq("id", editingUser.id);

    if (error) { showMsg(`❌ อัปเดตไม่สำเร็จ: ${error.message}`, "error"); setSaving(false); return; }

    await loadUsers();
    showMsg("🎉 อัปเดตข้อมูลสำเร็จ", "success");
    setEditingUser(null);
    setSaving(false);
  }

  async function handleDelete(target: any) {
    if (target.role === "admin" || target.username === "admin") {
      showMsg("❌ ไม่สามารถลบบัญชี Administrator ได้", "error"); return;
    }
    if (target.username === user?.username) {
      showMsg("❌ ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่", "error"); return;
    }
    const { error } = await supabase.from("app_users").delete().eq("id", target.id);
    if (error) { showMsg(`❌ ลบไม่สำเร็จ: ${error.message}`, "error"); return; }
    await loadUsers();
    showMsg(`🗑️ ลบผู้ใช้ "${target.fullname}" เรียบร้อยแล้ว`, "success");
  }

  async function handleResetPassword(target: any) {
    const newPw = generatePassword();
    const { error } = await supabase.from("app_users").update({
      password_hash: newPw,
      first_login:   true,
    }).eq("id", target.id);
    if (error) { showMsg(`❌ Reset ไม่สำเร็จ: ${error.message}`, "error"); return; }
    await loadUsers();
    showMsg(`🔑 Reset password "${target.fullname}" สำเร็จ  |  Password ใหม่: ${newPw}`, "success");
  }

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard")}
            className="text-sm px-3 py-1.5 rounded-lg border" style={cardStyle}>
            ← หลัก
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>👥 Account Management</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[["add", "➕ เพิ่มผู้ใช้ใหม่"], ["manage", "⚙️ จัดการ/แก้ไข"]].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key as any); setEditingUser(null); }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={tab === key
                ? { background: "var(--color-anu-accent)", color: "#fff" }
                : { ...cardStyle, border: "1px solid var(--color-anu-border)", color: "var(--color-anu-muted)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Message */}
        {msg.text && (
          <div className="rounded-lg px-4 py-3 mb-4 text-sm font-medium"
               style={{
                 background: msg.type === "success" ? "rgba(0,212,170,0.1)" : "rgba(255,71,87,0.1)",
                 color: msg.type === "success" ? "var(--color-anu-success)" : "var(--color-anu-danger)",
                 border: `1px solid ${msg.type === "success" ? "rgba(0,212,170,0.3)" : "rgba(255,71,87,0.3)"}`,
               }}>
            {msg.text}
          </div>
        )}

        {/* TAB: ADD */}
        {tab === "add" && (
          <div className="rounded-xl border p-6 max-w-2xl" style={cardStyle}>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-anu-text)" }}>
              📝 กรอกข้อมูลผู้ใช้ใหม่
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="sm:col-span-2">
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>ชื่อ-นามสกุล *</p>
                <input
                  type="text"
                  value={fn}
                  onChange={e => setFn(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>รหัสพนักงาน</p>
                <input
                  type="text"
                  value={eid}
                  onChange={e => setEid(e.target.value)}
                  placeholder="เช่น 67000001"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>ตำแหน่ง</p>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                >
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>

              {fn.trim() && (
                <div className="sm:col-span-2 rounded-lg p-4 flex flex-col gap-2"
                     style={{ background: "var(--color-anu-elevated)", border: "1px solid var(--color-anu-border)" }}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-1"
                     style={{ color: "var(--color-anu-muted)" }}>
                    ข้อมูลที่จะสร้างให้อัตโนมัติ
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-24" style={{ color: "var(--color-anu-muted)" }}>Username</span>
                    <span className="text-sm font-bold font-mono px-3 py-1 rounded-lg"
                          style={{ background: "var(--color-anu-surface)", color: "var(--color-anu-glow)" }}>
                      {previewUn || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-24" style={{ color: "var(--color-anu-muted)" }}>Password</span>
                    <span className="text-sm font-bold font-mono px-3 py-1 rounded-lg"
                          style={{ background: "var(--color-anu-surface)", color: "var(--color-anu-warning)" }}>
                      {previewPw}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewPw(generatePassword())}
                      className="text-xs px-2 py-1 rounded-lg border transition hover:opacity-80"
                      style={{ borderColor: "var(--color-anu-border)", color: "var(--color-anu-muted)" }}
                    >
                      🔄 สุ่มใหม่
                    </button>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--color-anu-danger)" }}>
                    ⚠️ บันทึก Username และ Password นี้ก่อนกดบันทึก เพราะจะไม่แสดงอีก
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={saving || !fn.trim()}
              className="mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition hover:opacity-90"
              style={{ background: "var(--color-anu-accent)", color: "#fff" }}
            >
              {saving ? "กำลังบันทึก..." : "💾 บันทึกและสร้างบัญชี"}
            </button>
          </div>
        )}

        {/* TAB: MANAGE */}
        {tab === "manage" && (
          <div className="flex flex-col gap-4">

            {editingUser && (
              <div className="rounded-xl border p-6 max-w-2xl"
                   style={{ ...cardStyle, borderColor: "var(--color-anu-glow)" }}>
                <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-anu-glow)" }}>
                  ✏️ แก้ไขข้อมูล: {editingUser.fullname}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "ชื่อ-นามสกุล *", value: editFn,  set: setEditFn,  ph: "ชื่อ นามสกุล"   },
                    { label: "รหัสพนักงาน",     value: editEid, set: setEditEid, ph: "เช่น 67000001"  },
                    { label: "Username *",       value: editUn,  set: setEditUn,  ph: "username"       },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{f.label}</p>
                      <input
                        value={f.value}
                        onChange={e => f.set(e.target.value)}
                        placeholder={f.ph}
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>
                  ))}
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>ตำแหน่ง</p>
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                      style={inputStyle}
                    >
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                    style={{ background: "var(--color-anu-accent)", color: "#fff" }}
                  >
                    {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="px-6 py-2.5 rounded-lg text-sm border"
                    style={cardStyle}
                  >
                    ❌ ยกเลิก
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-anu-border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--color-anu-elevated)" }}>
                    {["ชื่อ-นามสกุล", "รหัสพนักงาน", "Username", "ตำแหน่ง", "สถานะ", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium"
                          style={{ color: "var(--color-anu-muted)", borderBottom: "1px solid var(--color-anu-border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id}
                        style={{
                          background: i % 2 === 0 ? "var(--color-anu-surface)" : "var(--color-anu-void)",
                          borderTop: "1px solid var(--color-anu-border)"
                        }}>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--color-anu-text)" }}>{u.fullname}</td>
                      <td className="px-4 py-3" style={{ color: "var(--color-anu-muted)" }}>{u.emp_id || "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-anu-muted)" }}>{u.username}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                background: u.role === "admin"      ? "rgba(124,92,255,0.15)" :
                                            u.role === "supervisor" ? "rgba(255,165,2,0.15)"  :
                                            u.role === "manager"    ? "rgba(59,130,246,0.15)" :
                                            "rgba(100,116,139,0.15)",
                                color:      u.role === "admin"      ? "var(--color-anu-glow)"   :
                                            u.role === "supervisor" ? "var(--color-anu-warning)" :
                                            u.role === "manager"    ? "#3b82f6"                  :
                                            "var(--color-anu-muted)",
                              }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs"
                              style={{ color: u.first_login ? "var(--color-anu-warning)" : "var(--color-anu-success)" }}>
                          {u.first_login ? "⚠️ ยังไม่เปลี่ยน password" : "✅ ปกติ"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => startEdit(u)}
                            className="px-3 py-1.5 rounded-lg text-xs border transition hover:opacity-80"
                            style={{ borderColor: "var(--color-anu-glow)", color: "var(--color-anu-glow)" }}
                          >
                            📝 แก้ไข
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="px-3 py-1.5 rounded-lg text-xs border transition hover:opacity-80"
                            style={{ borderColor: "var(--color-anu-warning)", color: "var(--color-anu-warning)" }}
                            disabled={u.role === "admin"}
                          >
                            🔑 Reset pw
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="px-3 py-1.5 rounded-lg text-xs border transition hover:opacity-80"
                            style={{ borderColor: "var(--color-anu-danger)", color: "var(--color-anu-danger)" }}
                            disabled={u.role === "admin" || u.username === user?.username}
                          >
                            🗑️ ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--color-anu-muted)" }}>
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}