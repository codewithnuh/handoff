"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { IconArrowRight, IconEye } from "@tabler/icons-react";
import { WorkflowDemo } from "./workflow-demo";

const EASE = [0.23, 1, 0.32, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden"
      >
        <div className="h-[500px] w-[900px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-20 pt-20 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8 lg:pt-28">
        {/* Hero copy */}
        <div className="relative z-10 flex w-full max-w-7xl flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.1,
              ease: EASE,
            }}
          >
            <Badge className="gap-2 rounded-full px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>

              <span>For Freelancers & Creative Teams</span>
            </Badge>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: EASE,
            }}
            className="
              mt-6
              max-w-7xl
              text-balance
              text-4xl
              font-bold
              leading-[1.05]
              tracking-tight
              text-foreground
              sm:text-5xl
              md:text-6xl
              lg:text-7xl
          "
          >
            Stop chasing status updates.
            <span className="block text-muted-foreground">
              Start handing off work.
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.3,
              ease: EASE,
            }}
            className="
              mt-6
              max-w-2xl
              text-balance
              text-base
              leading-7
              text-muted-foreground
              sm:text-lg
              sm:leading-8
          "
          >
            Send one link. Your client sees what&apos;s done, approves or
            rejects work, and leaves feedback — all in one place. No more
            digging through email and WhatsApp for the latest answer.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.4,
              ease: EASE,
            }}
            className="
              mt-8
              flex
              w-full
              flex-col
              items-stretch
              justify-center
              gap-3
              sm:w-auto
              sm:flex-row
              sm:items-center
          "
          >
            <Button
              render={
                <Link href="/signup">
                  Get started free
                  <IconArrowRight
                    aria-hidden="true"
                    className="ml-1 size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              }
              nativeButton={false}
              size="lg"
              className="group h-11 w-full px-5 sm:w-auto"
            ></Button>

            <Button
              render={
                <Link href="#workflow-demo">
                  Watch how it works
                  <IconEye aria-hidden="true" className="ml-1 size-4" />
                </Link>
              }
              nativeButton={false}
              variant="outline"
              size="lg"
              className="h-11 w-full px-5 sm:w-auto"
            ></Button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.6,
            }}
            className="mt-4 text-xs text-muted-foreground sm:text-sm"
          >
            No credit card · No onboarding · Set up your first project in
            minutes
          </motion.p>
        </div>

        {/* Workflow */}
        <motion.div
          id="workflow-demo"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.55,
            ease: EASE,
          }}
          className="
            relative
            mt-14
            w-full
            max-w-6xl
            sm:mt-16
            lg:mt-20
          "
        >
          {/* Glow behind workflow */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -inset-4
              -z-10
              rounded-[2rem]
              bg-primary/5
              blur-2xl
              sm:-inset-8
            "
          />

          {/* Top fade */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -top-10
              left-1/2
              z-10
              h-20
              w-3/4
              -translate-x-1/2
              bg-background
              opacity-60
              blur-2xl
            "
          />

          <div
            className="
              overflow-hidden
              rounded-xl
              sm:rounded-2xl
            "
          >
            <WorkflowDemo />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
