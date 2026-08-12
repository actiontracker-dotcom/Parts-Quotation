"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Purely decorative — subtle pointer-driven tilt on the login card.
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -2.2, y: px * 2.2 });
  };

  const handlePointerLeave = () => setTilt({ x: 0, y: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setError(json.message || "Login failed. Please try again.");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface lg:grid lg:grid-cols-2">
      {/* ============ LEFT: brand panel (desktop/laptop only) ============ */}
      <section className="relative hidden overflow-hidden bg-[#0B1220] lg:flex lg:flex-col lg:justify-between">
        {/* deep gradient wash */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_10%,#1B2A4A_0%,#0B1220_55%,#070B14_100%)]" />

        {/* fine structural grid, evokes technical drawings / quotation ledgers */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        {/* floating soft 3D geometry */}
        <div className="qm-float-slow pointer-events-none absolute -left-16 top-16 h-72 w-72 rounded-[2.5rem] bg-gradient-to-br from-accent-500/25 to-transparent blur-2xl" />
        <div className="qm-float-slower pointer-events-none absolute right-[-4rem] top-1/3 h-64 w-64 rotate-12 rounded-full bg-gradient-to-tr from-sky-400/15 to-transparent blur-3xl" />
        <div className="qm-float-slow pointer-events-none absolute bottom-[-3rem] left-1/4 h-80 w-80 rounded-[3rem] bg-gradient-to-tr from-indigo-500/15 to-transparent blur-3xl" />

        <div className="qm-enter relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-2.5 text-white/90">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <span className="font-display text-sm font-semibold tracking-wide">
              Quotation Manager
            </span>
          </div>

          <div className="max-w-md">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10">
              <Sparkles className="h-3 w-3" />
              Order-to-delivery, in one place
            </span>
            <h2 className="font-display text-3xl font-semibold leading-tight text-white xl:text-4xl">
              Quote faster. Track every order with precision.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              A single, secure workspace for quotations, approvals, and
              delivery status — built for teams who move quickly and keep
              records straight.
            </p>
          </div>

          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Quotation Manager. Internal use only.
          </p>
        </div>
      </section>

      {/* ============ RIGHT: login form ============ */}
      <section className="relative flex min-h-screen items-center justify-center px-4 py-12">
        {/* soft ambient shapes behind the card, kept subtle on light background */}
        <div className="qm-float-slow pointer-events-none absolute -top-10 right-6 h-40 w-40 rounded-full bg-accent-100 opacity-40 blur-3xl lg:right-16" />
        <div className="qm-float-slower pointer-events-none absolute bottom-0 left-4 h-48 w-48 rounded-full bg-accent-50 opacity-60 blur-3xl lg:left-16" />

        <div className="relative w-full max-w-sm">
          <div className="qm-enter mb-6 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 shadow-sm ring-1 ring-accent-100">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold text-ink-900">
              Quotation Manager
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              Sign in to access your dashboard
            </p>
          </div>

          <div
            ref={cardRef}
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
            style={{
              transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}
            className="qm-enter-card qm-tilt"
          >
            <Card className="border border-ink-900/5 bg-white/80 p-6 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="qm-enter-field" style={{ animationDelay: "80ms" }}>
                  <Input
                    label="Username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
                <div className="qm-enter-field" style={{ animationDelay: "150ms" }}>
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="qm-shake rounded-lg bg-danger-50 px-3 py-2.5 text-sm font-medium text-danger-600"
                  >
                    {error}
                  </div>
                )}

                <div className="qm-enter-field" style={{ animationDelay: "220ms" }}>
                  <Button
                    type="submit"
                    loading={loading}
                    icon={LogIn}
                    className="qm-btn w-full"
                  >
                    Login
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          <p className="qm-enter mt-5 text-center text-xs text-ink-300" style={{ animationDelay: "260ms" }}>
            Authorized users only. Contact your administrator for access.
          </p>
        </div>
      </section>

      <style jsx global>{`
        @keyframes qm-fade-up {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes qm-float-slow {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-16px) rotate(3deg);
          }
        }
        @keyframes qm-float-slower {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(14px) translateX(-10px);
          }
        }
        @keyframes qm-shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-3px);
          }
          40% {
            transform: translateX(3px);
          }
          60% {
            transform: translateX(-2px);
          }
          80% {
            transform: translateX(2px);
          }
        }

        .qm-enter {
          animation: qm-fade-up 0.6s ease-out both;
        }
        .qm-enter-card {
          animation: qm-fade-up 0.7s ease-out 0.1s both;
          transition: transform 0.25s ease-out;
        }
        .qm-enter-field {
          animation: qm-fade-up 0.5s ease-out both;
        }
        .qm-shake {
          animation: qm-shake 0.4s ease-in-out;
        }
        .qm-float-slow {
          animation: qm-float-slow 9s ease-in-out infinite;
        }
        .qm-float-slower {
          animation: qm-float-slower 13s ease-in-out infinite;
        }
        .qm-tilt {
          transform-style: preserve-3d;
        }
        .qm-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .qm-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px -8px rgba(15, 23, 42, 0.35);
        }

        @media (prefers-reduced-motion: reduce) {
          .qm-enter,
          .qm-enter-card,
          .qm-enter-field,
          .qm-shake,
          .qm-float-slow,
          .qm-float-slower {
            animation: none !important;
          }
          .qm-tilt {
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
}