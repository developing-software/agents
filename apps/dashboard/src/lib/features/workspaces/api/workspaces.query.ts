import { invalidateAll } from "$app/navigation";
import { createMutation } from "@tanstack/svelte-query";
import { call, read } from "#lib/query.ts";
import {
  acceptInvite,
  declineInvite,
  enterWorkspace,
  getCurrent,
  getInvites,
  getOffers,
  getVacant,
  getInspect,
  getMembers,
  getMine,
  getMode,
  getRegistry,
  getUsage,
  retrySetup,
  revokeInvite,
  switchWorkspace,
} from "./workspaces.remote";

// No API route: remote functions behind plain keys, all under `workspaces` so one
// `invalidate(["workspaces"])` after a form refreshes every view of them.
type Rows = { state: { data?: { status: string }[] } };

// Polls while a row is still being set up, so `pending` turns `ready` without a reload.
const poll = (q: Rows) => (q.state.data?.some((one) => one.status === "pending") ? 1500 : false);

export const mode = () => ({
  queryKey: ["workspaces", "mode"],
  queryFn: read(() => getMode()),
  staleTime: Infinity,
});

export const current = () => ({
  queryKey: ["workspaces", "current"],
  queryFn: read(() => getCurrent()),
});

export const mine = () => ({
  queryKey: ["workspaces", "mine"],
  queryFn: read(() => getMine()),
  refetchInterval: poll,
});

export const members = () => ({
  queryKey: ["workspaces", "members"],
  queryFn: read(() => getMembers()),
});

export const vacant = () => ({
  queryKey: ["workspaces", "vacant"],
  queryFn: read(() => getVacant()),
});

export const offers = () => ({
  queryKey: ["workspaces", "offers"],
  queryFn: read(() => getOffers()),
});

export const invites = () => ({
  queryKey: ["workspaces", "invites"],
  queryFn: read(() => getInvites()),
});

export const registry = () => ({
  queryKey: ["workspaces", "registry"],
  queryFn: read(() => getRegistry()),
  refetchInterval: (q: { state: { data?: { rows: { status: string }[] } } }) =>
    poll({ state: { data: q.state.data?.rows } }),
});

export const inspect = (slug: string) => ({
  queryKey: ["workspaces", "inspect", slug],
  queryFn: read(() => getInspect({ slug })),
  refetchInterval: (q: { state: { data?: { workspace: { status: string } } } }) =>
    q.state.data?.workspace.status === "pending" ? 1500 : false,
});

export const usage = (slug: string) => ({
  queryKey: ["workspaces", "usage", slug],
  queryFn: read(() => getUsage({ slug })),
});

// No `meta`: every query belongs to the old workspace, so the whole cache goes, loads too.
export const choose = () =>
  createMutation(() => ({
    mutationFn: call(switchWorkspace),
    onSuccess: () => invalidateAll(),
  }));

// Entering a workspace swaps every query's tenant, so the whole cache goes, loads too.
export const accept = () =>
  createMutation(() => ({
    mutationFn: call(acceptInvite),
    onSuccess: () => invalidateAll(),
  }));

export const arrive = () =>
  createMutation(() => ({
    mutationFn: call(enterWorkspace),
    onSuccess: () => invalidateAll(),
  }));

export const decline = () =>
  createMutation(() => ({
    mutationFn: call(declineInvite),
    meta: { invalidates: [["workspaces"]] },
  }));

export const revoke = () =>
  createMutation(() => ({
    mutationFn: call(revokeInvite),
    meta: { invalidates: [["workspaces"]] },
  }));

export const retry = () =>
  createMutation(() => ({
    mutationFn: call(retrySetup),
    meta: { invalidates: [["workspaces"]] },
  }));
