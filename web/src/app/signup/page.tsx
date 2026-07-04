"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { ImageSlider } from "@/components/ui/image-slider";
import { Button, Input } from "@/components/ui";

const SLIDES = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=900&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=900&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=900&auto=format&fit=crop&q=60",
];

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
  hidden: { y: 18, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 12 } },
} as const;

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await getSupabaseBrowser().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    if (!data.session) {
      setLoading(false);
      return setNotice("Check your email to confirm your account, then log in.");
    }
    // Keep loading true through the redirect for visible feedback.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <motion.div
        className="grid h-[640px] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-neutral-200 shadow-2xl dark:border-neutral-800 lg:grid-cols-2"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Left: form */}
        <div className="flex h-full flex-col items-center justify-center bg-white p-8 dark:bg-neutral-900 md:p-12">
          <motion.div className="w-full max-w-sm" variants={container} initial="hidden" animate="visible">
            <motion.h1 variants={item} className="mb-2 text-3xl font-bold tracking-tight">
              Create your account
            </motion.h1>
            <motion.p variants={item} className="mb-8 text-neutral-500">
              Start finding faces in seconds.
            </motion.p>

            <motion.form variants={item} onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Full name</label>
                <Input id="name" placeholder="Alex Rivera" value={fullName}
                  required onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input id="email" type="email" placeholder="you@studio.com" value={email}
                  required onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Input id="password" type="password" placeholder="Min 6 characters" value={password}
                  minLength={6} required onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {notice && <p className="text-sm text-green-600">{notice}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating…" : "Sign up"}
              </Button>
            </motion.form>

            <motion.p variants={item} className="mt-8 text-center text-sm text-neutral-500">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand hover:underline">Log in</Link>
            </motion.p>
          </motion.div>
        </div>

        {/* Right: slider */}
        <div className="relative hidden lg:block">
          <ImageSlider images={SLIDES} interval={4000} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-14 left-8 right-8 text-2xl font-black uppercase leading-tight text-white">
            Upload once.<br /><span className="text-brand">Everyone finds themselves.</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
