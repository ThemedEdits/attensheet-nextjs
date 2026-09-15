"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth, firestore } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, GraduationCap, User, ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import type { Role } from "@/lib/domain";

const roles: { 
  value: Role; 
  title: string; 
  description: string;
  icon: typeof ShieldCheck;
}[] = [
  { 
    value: "cr", 
    title: "Class Representative", 
    description: "Create and manage your class workspace, subjects, and Google Sheets integration.",
    icon: ShieldCheck,
  },
  { 
    value: "teacher", 
    title: "Course Teacher", 
    description: "Mark attendance for your assigned subjects and synchronize registers.",
    icon: GraduationCap,
  },
  { 
    value: "student", 
    title: "Student", 
    description: "View your classes, track attendance percentages, and monitor your records.",
    icon: User,
  },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) router.replace("/login");
      else {
        setUid(user.uid);
        setName(user.displayName ?? "");
      }
    });
    return unsubscribe;
  }, [router]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await setDoc(
        doc(firestore, "users", uid),
        {
          uid,
          email: firebaseAuth.currentUser?.email,
          name,
          role,
          profileCompleted: true,
          photoURL: firebaseAuth.currentUser?.photoURL ?? "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      router.replace(role === "cr" ? "/cr/setup" : "/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-2">
          <img 
            src="/attensheetlogo.svg" 
            alt="AttenSheet" 
            className="h-7 w-auto object-contain" 
          />
          <span className="text-xs font-bold tracking-wider text-[var(--accent)] uppercase">
            AttenSheet Onboarding
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Tell us how you&apos;ll use AttenSheet
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]">
          This customizes your workspace and permissions. Once chosen, your role is permanently assigned.
        </p>

        <form onSubmit={save} className="mt-8 space-y-6">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Your full name
            </label>
            <input
              required
              minLength={2}
              value={name}
              onBlur={() => setNameTouched(true)}
              onChange={(e) => setName(e.target.value)}
              className={`field mt-1.5 transition-all ${
                nameTouched && !name.trim() ? "border-red-500/70 ring-1 ring-red-500/20 bg-red-500/[0.02]" : ""
              }`}
              placeholder="e.g. Hammad Ahmed"
            />
            {nameTouched && !name.trim() && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-none text-red-400" />
                <span>Please enter your full name.</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2.5">
              Select your academic role
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {roles.map((item) => {
                const isSelected = role === item.value;
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => setRole(item.value)}
                    className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_16px_rgba(53,217,138,0.15)]"
                        : "border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className={`grid h-8 w-8 place-items-center rounded-lg ${
                          isSelected ? "bg-[var(--primary)] text-[#07110D]" : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {isSelected && (
                          <div className="grid h-5 w-5 place-items-center rounded-full bg-[var(--accent)] text-[#07110D]">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className={`mt-3 text-sm font-semibold ${isSelected ? "text-white" : "text-[var(--text-primary)]"}`}>
                        {item.title}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            disabled={busy || !name.trim()}
            className="button-primary w-full py-3 sm:py-3.5"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Configuring workspace...</span>
              </>
            ) : (
              <>
                <span>Continue to workspace</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

