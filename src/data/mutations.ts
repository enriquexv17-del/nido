/** Acciones que modifican datos. Invalidan la caché para refrescar la UI. */
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import { useAuth } from "./auth";
import { useDataContext } from "./provider";
import { useDerived } from "./queries";
import type { Actor } from "./api";

function useActor(): Actor {
  const { user } = useAuth();
  const { snapshot } = useDerived();
  const member =
    snapshot?.members.find((m) => m.userId && m.userId === user?.id) ?? snapshot?.members[0];
  return { id: member?.id ?? "", name: member?.name ?? "" };
}

function useInvalidate() {
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["snapshot"] });
  }, [qc]);
}

export function useExpenseActions() {
  const { month } = useDataContext();
  const actor = useActor();
  const invalidate = useInvalidate();

  const create = useMutation({
    mutationFn: (input: api.ExpenseInput) => api.createExpense(input, month, actor),
    onSuccess: invalidate
  });
  const update = useMutation({
    mutationFn: (args: { id: string; patch: api.ExpenseInput }) =>
      api.updateExpense(args.id, args.patch, actor),
    onSuccess: invalidate
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteExpense(id, actor),
    onSuccess: invalidate
  });

  return {
    createExpense: create.mutateAsync,
    updateExpense: update.mutateAsync,
    deleteExpense: remove.mutateAsync,
    isSaving: create.isPending || update.isPending || remove.isPending
  };
}

export function useIncomeActions() {
  const { month } = useDataContext();
  const actor = useActor();
  const invalidate = useInvalidate();

  const save = useMutation({
    mutationFn: (input: {
      memberId: string;
      gross: number;
      afpOn: boolean;
      isssOn: boolean;
      isrOn: boolean;
    }) => api.saveIncome({ ...input, month, actor }),
    onSuccess: invalidate
  });

  return { saveIncome: save.mutateAsync, isSaving: save.isPending };
}

export function useMemberActions() {
  const invalidate = useInvalidate();

  const add = useMutation({
    mutationFn: (args: { name: string; color: string }) => api.addMember(args.name, args.color),
    onSuccess: invalidate
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.removeMember(id),
    onSuccess: invalidate
  });
  const regenerate = useMutation({
    mutationFn: () => api.regenerateCode(),
    onSuccess: invalidate
  });

  return {
    addMember: add.mutateAsync,
    removeMember: remove.mutateAsync,
    regenerateCode: regenerate.mutateAsync,
    isSaving: add.isPending || remove.isPending || regenerate.isPending
  };
}

export function useCopyMonth() {
  const invalidate = useInvalidate();
  const copy = useMutation({
    mutationFn: (args: { from: string; to: string }) => api.copyMonth(args.from, args.to),
    onSuccess: invalidate
  });
  return { copyMonth: copy.mutateAsync, isSaving: copy.isPending };
}
