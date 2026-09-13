"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth, firestore } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/domain";

const roles: { value: Role; title: string; description: string }[] = [
  { value: "cr", title: "Class Representative", description: "Create and manage your class workspace." },
  { value: "teacher", title: "Teacher", description: "Mark attendance for your assigned subject." },
  { value: "student", title: "Student", description: "View your subjects and attendance." },
];
export default function CompleteProfilePage() {
  const router = useRouter(); const [uid, setUid] = useState(""); const [name, setName] = useState(""); const [role, setRole] = useState<Role>("student"); const [busy, setBusy] = useState(false);
  useEffect(() => onAuthStateChanged(firebaseAuth, (user) => { if (!user) router.replace("/login"); else { setUid(user.uid); setName(user.displayName ?? ""); } }), [router]);
  async function save(event: React.FormEvent) { event.preventDefault(); setBusy(true); await setDoc(doc(firestore, "users", uid), { uid, email: firebaseAuth.currentUser?.email, name, role, profileCompleted: true, photoURL: firebaseAuth.currentUser?.photoURL ?? "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }); router.replace(role === "cr" ? "/cr/setup" : "/dashboard"); }
  return <main className="grid min-h-screen place-items-center px-6 py-10"><form onSubmit={save} className="w-full max-w-2xl"><p className="text-sm text-emerald-400">Welcome to attensheet.</p><h1 className="mt-2 text-4xl font-semibold text-white">Tell us how you&apos;ll use it.</h1><p className="mt-3 text-slate-400">This helps us give you the right workspace. Your role is intentionally not casually changeable later.</p><label className="mt-8 block text-sm text-slate-300">Full name<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="field" /></label><div className="mt-8 grid gap-3 md:grid-cols-3">{roles.map((item) => <button type="button" key={item.value} onClick={() => setRole(item.value)} className={`rounded-xl border p-5 text-left transition ${role === item.value ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}><p className="font-medium text-white">{item.title}</p><p className="mt-2 text-xs leading-5 text-slate-400">{item.description}</p></button>)}</div><button disabled={busy} className="button-primary mt-8">{busy ? "Saving..." : "Continue"} <span>→</span></button></form></main>;
}
