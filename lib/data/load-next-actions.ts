import { getNextActionsForCustomers } from "@/lib/db/queries";
import {
  type CustomerNextActionItem,
  type NextActionsByCustomerId,
} from "@/lib/schema";

/** 各顧客の未完了次回アクション（最新 1 件）を Map 化して返す。 */
export async function loadOpenNextActionsByCustomerId(
  customerIds: string[],
): Promise<NextActionsByCustomerId> {
  const actions = await getNextActionsForCustomers(customerIds);
  const byCustomerId: NextActionsByCustomerId = Object.fromEntries(
    customerIds.map((id) => [id, null]),
  );

  for (const action of actions) {
    if (action.isDone) {
      continue;
    }
    if (byCustomerId[action.customerId] == null) {
      byCustomerId[action.customerId] = action;
    }
  }

  return byCustomerId;
}

export function pickOpenNextAction(
  actions: CustomerNextActionItem[],
  customerId: string,
): CustomerNextActionItem | null {
  return (
    actions.find(
      (action) => action.customerId === customerId && !action.isDone,
    ) ?? null
  );
}
