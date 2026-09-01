"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { getPointValue, KNOWN_FUTURES_SYMBOLS } from "@/lib/trading/contracts";
import { formatCurrency } from "@/lib/trading/calc";

export function PositionSizeCalculator({
  defaultRiskDollars,
}: {
  defaultRiskDollars: number | null;
}) {
  const [symbol, setSymbol] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [riskDollars, setRiskDollars] = useState(
    defaultRiskDollars !== null ? String(defaultRiskDollars) : "",
  );

  const result = useMemo(() => {
    const entry = Number(entryPrice);
    const stop = Number(stopPrice);
    const risk = Number(riskDollars);
    if (!symbol.trim() || !entry || !stop || !risk || entry === stop) return null;

    const { pointValue, isKnown } = getPointValue(symbol);
    const stopDistance = Math.abs(entry - stop);
    const riskPerContract = stopDistance * pointValue;
    const contracts = Math.floor(risk / riskPerContract);
    const actualRisk = contracts * riskPerContract;

    return { stopDistance, contracts, actualRisk, isKnown };
  }, [symbol, entryPrice, stopPrice, riskDollars]);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Position size calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Symbol">
          <input
            type="text"
            list="calc-symbols"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className={inputClass}
          />
          <datalist id="calc-symbols">
            {KNOWN_FUTURES_SYMBOLS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>

        <Field label="Risk this trade ($)">
          <input
            type="number"
            step="any"
            value={riskDollars}
            onChange={(e) => setRiskDollars(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Entry price">
          <input
            type="number"
            step="any"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Stop price">
          <input
            type="number"
            step="any"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {result && (
        <div className="mt-4 space-y-1 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-sm">
          {!result.isKnown && (
            <p className="mb-2 text-amber-300">
              Unrecognized symbol — using $1/point. Add it to{" "}
              <code>lib/trading/contracts.ts</code> for an accurate size.
            </p>
          )}
          <p>
            Stop distance:{" "}
            <span className="font-medium text-neutral-50">{result.stopDistance.toFixed(2)} points</span>
          </p>
          <p>
            Suggested size:{" "}
            <span className="font-medium text-neutral-50">
              {result.contracts} contract{result.contracts === 1 ? "" : "s"}
            </span>
          </p>
          <p>
            Actual risk at that size:{" "}
            <span className="font-medium text-neutral-50">{formatCurrency(result.actualRisk)}</span>
          </p>
          {result.contracts === 0 && (
            <p className="text-amber-300">
              Risk amount is too small for even 1 contract at this stop distance.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
