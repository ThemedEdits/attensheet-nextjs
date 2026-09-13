"use client";

import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase";
import { classSchema } from "@/lib/validation";
import { generateClassCode } from "@/lib/class-code";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClassSetupPage() {
  const router = useRouter(); const [form, setForm] = useState({ university: "FUUAST", semester: "3rd Semester", department: "Computer Science", batch: "2024", className: "BSCS-6", section: "D" }); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); const parsed = classSchema.safeParse(form); if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the form."); return; } setBusy(true);
    const user = firebaseAuth.currentUser; if (!user) { router.replace("/login"); return; }
    const existing = await getDocs(query(collection(firestore, "classes"), where("crUid", "==", user.uid))); if (!existing.empty) { setError("You already have a class."); setBusy(false); return; }
    const id = doc(collection(firestore, "classes")).id; await setDoc(doc(firestore, "classes", id), { ...form, crUid: user.uid, classCode: generateClassCode(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); router.replace("/dashboard");
  }
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-12"><p className="text-sm text-emerald-400">Class representative setup</p><h1 className="mt-2 text-4xl font-semibold text-white">Create your class workspace</h1><p className="mt-3 text-slate-400">You can manage one class in version one. Google Sheets connection can be completed from the dashboard.</p><form onSubmit={submit} className="mt-10 grid gap-5 sm:grid-cols-2">{Object.entries(form).map(([key, value]) => <label key={key} className="text-sm capitalize text-slate-300">{key.replace(/([A-Z])/g, " $1")}<input required value={value} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} className="field" /></label>)}{error && <p className="sm:col-span-2 rounded-lg bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}<button disabled={busy} className="button-primary sm:col-span-2">{busy ? "Creating..." : "Create class"} <span>→</span></button></form></main>;
}
