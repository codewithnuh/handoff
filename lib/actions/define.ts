import type { ZodType } from "zod";

import { requireWorkspace } from "@/lib/access";
import type {
  Guarded,
  ProjectAccess,
  WorkspaceContext,
} from "@/lib/access";
import { toActionError } from "@/lib/actions/helpers";
import type { ErrorMapOptions } from "@/lib/actions/helpers";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { ERROR_CODES } from "@/lib/constants/errors";
import {
  assertWorkspaceWritable,
  type LimitCheckResult,
} from "@/lib/services/plan-limits";
import type { ActionError, ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";

type MaybePromise<T> = T | Promise<T>;

/**
 * One band of the pipeline. Runs after the guard with the resolved context
 * and the validated input; return an error to short-circuit the action.
 */
export type ActionCheck<C, S> = (
  ctx: C,
  input: S,
) => MaybePromise<ActionError | null>;

type Schema<S> = ZodType<S, unknown>;

type CommonConfig<C, S> = {
  check?: ActionCheck<C, S> | ActionCheck<C, S>[];
  errors?: ErrorMapOptions;
  revalidate?: boolean;
};

type GuardedConfig<S, C, R> = CommonConfig<C, S> & {
  schema: Schema<S>;
  guard?: ((input: S) => MaybePromise<Guarded<C>>) | null;
  run: (input: S, ctx: C) => Promise<ActionResponseType<R>>;
};

type BareConfig<C, R> = CommonConfig<C, undefined> & {
  schema?: undefined;
  guard?: (() => MaybePromise<Guarded<C>>) | null;
  run: (ctx: C) => Promise<ActionResponseType<R>>;
};

type PipelineConfig<S, C, R> = {
  schema?: Schema<S>;
  guard?: ((input: S) => MaybePromise<Guarded<C>>) | null;
  check?: ActionCheck<C, S> | ActionCheck<C, S>[];
  errors?: ErrorMapOptions;
  revalidate?: boolean;
  run: (input: S, ctx: C) => Promise<ActionResponseType<R>>;
};

const execute = async <S, C, R>(
  config: PipelineConfig<S, C, R>,
  data?: S,
): Promise<ActionResponseType<R>> => {
  try {
    let input = data as S;

    if (config.schema) {
      const parsed = config.schema.safeParse(data);
      if (!parsed.success) {
        return ActionResponse.failure(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid input",
          parsed.error.flatten().fieldErrors as Record<string, string[]>,
        );
      }
      input = parsed.data;
    }

    const guard =
      config.guard === undefined
        ? (requireWorkspace as unknown as (input: S) => MaybePromise<
            Guarded<C>
          >)
        : config.guard;

    let ctx: C;
    if (guard) {
      const guarded = await guard(input);
      if (!guarded.ok) return guarded.error;
      ctx = guarded.value;
    } else {
      ctx = undefined as unknown as C;
    }

    const checks = config.check
      ? Array.isArray(config.check)
        ? config.check
        : [config.check]
      : [];

    for (const check of checks) {
      const error = await check(ctx, input);
      if (error) return error;
    }

    const result = await config.run(input, ctx);
    if (config.revalidate && result.success) revalidateDashboard();
    return result;
  } catch (error) {
    return toActionError(error, config.errors);
  }
};

/**
 * Builds a server action out of the shared pipeline:
 * validate → guard → checks → run → revalidate, with every throw mapped
 * onto the one `ActionResponseType` envelope.
 *
 * Omitting `guard` means `requireWorkspace`; pass `guard: null` only for
 * actions that must run before a session exists.
 */
export function defineAction<S, C = WorkspaceContext, R = never>(
  config: GuardedConfig<S, C, R>,
): (data: S) => Promise<ActionResponseType<R>>;
export function defineAction<C = WorkspaceContext, R = never>(
  config: BareConfig<C, R>,
): () => Promise<ActionResponseType<R>>;
export function defineAction<S, C, R>(
  config: GuardedConfig<S, C, R> | BareConfig<C, R>,
):
  | ((data: S) => Promise<ActionResponseType<R>>)
  | (() => Promise<ActionResponseType<R>>) {
  if ("schema" in config && config.schema) {
    const guarded = config as GuardedConfig<S, C, R>;
    return (data: S) =>
      execute<S, C, R>(guarded as PipelineConfig<S, C, R>, data);
  }

  const bare = config as BareConfig<C, R>;
  const pipeline: PipelineConfig<undefined, C, R> = {
    ...bare,
    run: (_input: undefined, ctx: C) => bare.run(ctx),
  };
  return () => execute<undefined, C, R>(pipeline);
}

type Capability =
  | "canEditProject"
  | "canDeleteProject"
  | "canManageDeliverables"
  | "canSubmitForReview"
  | "canUpdateRequests"
  | "isObserver";

export const can = (
  capability: Capability,
  message: string,
): ActionCheck<ProjectAccess, unknown> =>
  (ctx) =>
    ctx[capability]
      ? null
      : ActionResponse.failure(ERROR_CODES.FORBIDDEN, message);

export const writable = async (
  ctx: { workspaceId: string } | { workspace: { id: string } },
): Promise<ActionError | null> =>
  assertWorkspaceWritable(
    "workspaceId" in ctx ? ctx.workspaceId : ctx.workspace.id,
  );

/** Lifts a `Guarded`/`LimitCheckResult`-returning guard into a check. */
export const ensure =
  <C, S>(
    fn: (ctx: C, input: S) => Promise<Guarded<unknown> | LimitCheckResult>,
  ): ActionCheck<C, S> =>
  async (ctx, input) => {
    const outcome = await fn(ctx, input);
    return outcome.ok ? null : outcome.error;
  };
