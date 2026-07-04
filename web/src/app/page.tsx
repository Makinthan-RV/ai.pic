"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { PeopleSphere } from "@/components/PeopleSphere";
import { LiveMatchDemo } from "@/components/LiveMatchDemo";

const SHADOW =
  "1px 1px 0 #001A99,2px 2px 0 #001A99,3px 3px 0 #001A99,4px 4px 0 #001A99,5px 5px 0 #001A99,6px 6px 0 #001A99,7px 7px 0 #001A99,8px 8px 0 #001A99,9px 9px 0 #001A99,10px 10px 0 #001A99";

const HEADLINE = 'font-black uppercase tracking-tighter leading-[0.85] m-0';
const HEADLINE_STYLE = { fontFamily: '"Arial Black", Impact, sans-serif', textShadow: SHADOW };

export default function Landing() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0038FF] font-sans text-white selection:bg-[#CCFF00] selection:text-black">
      {/* Grid backdrop */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Navbar */}
      <nav className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <div className="flex items-center gap-1">
          <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-1.5 text-xs font-black tracking-tight text-black shadow-sm md:text-sm">
            PHOTO
          </div>
          <div className="rounded-full border-[1.5px] border-white bg-[#CCFF00] px-3 py-1.5 text-xs font-black text-black shadow-sm md:text-sm">
            FINDER
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {["How it works", "For photographers", "Pricing"].map((i) => (
            <span key={i} className="rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold">
              {i}
            </span>
          ))}
        </div>
        <Link
          href="/login"
          className="rounded-full border border-white px-6 py-2 text-xs font-semibold transition-colors hover:bg-white hover:text-[#0038FF] md:text-sm"
        >
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center px-4 pt-6 pb-28 md:pt-10">
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div className="relative z-10 flex w-full flex-col items-center space-y-1 md:space-y-3">
            <div className="flex w-full justify-start pl-[8%] md:pl-[22%]">
              <h1 className={`${HEADLINE} text-[#CCFF00] text-[clamp(3.5rem,11vw,150px)]`} style={HEADLINE_STYLE}>
                YOUR
              </h1>
            </div>
            <div className="flex w-full justify-center">
              <h1 className={`${HEADLINE} text-white text-[clamp(4rem,14vw,210px)]`} style={HEADLINE_STYLE}>
                PHOTOS
              </h1>
            </div>
            <div className="flex w-full justify-start pl-[12%] md:pl-[28%]">
              <h1 className={`${HEADLINE} text-white text-[clamp(3.5rem,11vw,150px)]`} style={HEADLINE_STYLE}>
                FIND YOU
              </h1>
            </div>
          </div>

          {/* Floating photo cards */}
          <div className="pointer-events-none absolute inset-0 h-full w-full">
            <FloatCard
              className="bottom-[6%] left-[2%] md:left-[16%] rotate-[-10deg]"
              img="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80"
              name="You, at Table 4"
              sub="1 of 12 matches"
              delay={0}
            />
            <FloatCard
              className="top-[10%] right-[2%] md:right-[18%] rotate-[10deg]"
              img="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80"
              name="You, on the dancefloor"
              sub="found in 0.4s"
              delay={1}
            />
          </div>

          {/* Get started badge */}
          <Link href="/signup" className="pointer-events-auto absolute bottom-[-4%] right-[4%] z-40 md:right-[16%]">
            <div className="relative flex h-28 w-28 rotate-12 items-center justify-center rounded-full border-[3px] border-black/5 bg-[#CCFF00] shadow-xl transition-transform hover:scale-105 md:h-36 md:w-36">
              <div className="absolute inset-1 animate-[spin_10s_linear_infinite]">
                <svg viewBox="0 0 100 100" className="h-full w-full">
                  <path id="cp" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none" />
                  <text className="text-[11px] font-black uppercase tracking-[0.18em]" fill="black">
                    <textPath href="#cp" startOffset="0%">
                      GET STARTED FREE • GET STARTED FREE •
                    </textPath>
                  </text>
                </svg>
              </div>
              <span className="text-2xl font-black text-black">→</span>
            </div>
          </Link>
        </div>

        <p className="relative z-30 mt-10 max-w-md text-center text-sm font-semibold text-white/80 md:text-base">
          Photographers upload the whole event. Guests scan a QR, take a selfie,
          and instantly get every photo they&apos;re in — powered by face AI.
        </p>
        <Link
          href="/signup"
          className="relative z-30 mt-6 rounded-full bg-[#CCFF00] px-8 py-3 text-sm font-black uppercase text-black shadow-lg transition-transform hover:scale-105"
        >
          Create your first event
        </Link>
      </main>

      {/* Live match demo */}
      <section className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 pb-8 pt-20 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl"
        >
          <LiveMatchDemo />
        </motion.div>
      </section>

      {/* Interactive people sphere */}
      <section className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 pb-16 pt-4 text-center">
        <h2 className="text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
          Every face becomes <span className="text-[#CCFF00]">searchable</span>
        </h2>
        <p className="mt-2 max-w-md text-sm font-semibold text-white/70">
          Drag to spin. Thousands of guests, indexed the moment they&apos;re uploaded.
        </p>
        <div className="mt-4">
          <PeopleSphere />
        </div>
      </section>

      {/* Features */}
      <section className="relative z-20 mt-auto w-full rounded-t-[2.5rem] bg-white px-6 py-12 text-black shadow-[0_-20px_50px_rgba(0,0,0,0.2)] md:rounded-t-[3.5rem] md:px-10 md:py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { n: "01", t: "UPLOAD THE EVENT", d: "Drop in thousands of photos. Faces are indexed automatically." },
            { n: "02", t: "SHARE A QR CODE", d: "Every event gets a QR. Guests scan it — no app, no login." },
            { n: "03", t: "SELFIE FINDS PHOTOS", d: "One selfie returns every photo that guest appears in, ranked." },
          ].map((c) => (
            <div key={c.n} className="relative flex h-56 flex-col rounded-[2rem] border border-gray-100 bg-[#F8F9FA] p-8">
              <span className="text-4xl font-black text-[#0038FF]">{c.n}</span>
              <h3 className="mt-3 text-xl font-black uppercase leading-tight">{c.t}</h3>
              <p className="mt-auto text-xs font-bold text-black/60">{c.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FloatCard({
  className,
  img,
  name,
  sub,
  delay,
}: {
  className: string;
  img: string;
  name: string;
  sub: string;
  delay: number;
}) {
  return (
    <motion.div
      animate={{ y: [0, -16, 0] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
      className={`pointer-events-auto absolute z-30 ${className}`}
    >
      <div className="flex w-36 flex-col items-center rounded-[2rem] border border-white/40 bg-white/20 p-4 shadow-2xl backdrop-blur-md transition-transform duration-500 hover:rotate-0 md:w-48 md:p-5">
        <div className="mb-3 h-16 w-16 overflow-hidden rounded-full border-[3px] border-white/50 md:h-24 md:w-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" className="h-full w-full object-cover" />
        </div>
        <p className="text-center text-sm font-bold text-white md:text-base">{name}</p>
        <p className="mt-1 text-[10px] text-white/80 md:text-xs">{sub}</p>
      </div>
    </motion.div>
  );
}
