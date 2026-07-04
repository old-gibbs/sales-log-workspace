"use client";

import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PANE3_SECTION } from "@/lib/labels";
import { type CustomerLedger } from "@/lib/schema";

function formatUnitPrice(value: number | null): string {
  if (value === null) return "—";
  if (value >= 100) return `${value.toLocaleString("ja-JP")}円`;
  return `${value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}円`;
}

function LedgerItemsCardContent({ ledger }: { ledger: CustomerLedger }) {
  return (
    <div className="flex flex-col gap-4">
      <CardDescription>{PANE3_SECTION.ledgerItemsDescription}</CardDescription>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">品目 {ledger.itemCount} 件</Badge>
        <Badge variant="secondary">
          仕入先 {ledger.supplierCount} 社（マスク済）
        </Badge>
        {ledger.latestShipDate && (
          <Badge variant="outline">直近出荷 {ledger.latestShipDate}</Badge>
        )}
      </div>

      {ledger.topCategories.length > 0 && (
        <p className="text-xs text-muted-foreground">
          主要カテゴリ:{" "}
          {ledger.topCategories.map((c) => `${c.label} ${c.count}`).join(" / ")}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">品目名</th>
              <th className="px-3 py-2 font-medium">分類</th>
              <th className="px-3 py-2 font-medium text-right">単価</th>
              <th className="px-3 py-2 font-medium">最終出荷</th>
            </tr>
          </thead>
          <tbody>
            {ledger.items.map((item, index) => (
              <tr
                key={`${item.itemCode}-${index}`}
                className="border-b border-border last:border-b-0"
              >
                <td className="max-w-[12rem] truncate px-3 py-2 text-foreground">
                  {item.itemName}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {item.categoryLabel}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {formatUnitPrice(item.sellPrice)}
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {item.lastShipDate ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        直近出荷順 上位 {ledger.items.length} 件を表示（名称抽象化・単価約30%上乗せ）
      </p>
    </div>
  );
}

export function LedgerItemsCard({
  ledger,
  open,
  onOpenChange,
  candidateKey,
}: {
  ledger: CustomerLedger | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateKey: string;
}) {
  if (!ledger || ledger.items.length === 0) return null;

  return (
    <Card>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          nativeButton={false}
          render={
            <CardHeader className="group/trigger cursor-pointer rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          }
        >
          <CardTitle emphasis="prominent">{PANE3_SECTION.ledgerItems}</CardTitle>
          <CardAction>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-[color,transform] group-hover/trigger:text-foreground in-data-[panel-open]:rotate-180"
            />
            <span className="sr-only">{`${PANE3_SECTION.ledgerItems}を開く`}</span>
          </CardAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <LedgerItemsCardContent key={candidateKey} ledger={ledger} />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
