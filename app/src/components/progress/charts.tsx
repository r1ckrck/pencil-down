"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/*
 * Chart vocabulary for Progress. Colours come only from --data-* tokens; axes and grid are hairlines;
 * text wears text tokens, never the series colour. Single series per chart, so the title names it and
 * no legend box is needed. Hover shows a tooltip with the exact value.
 */

export type Series = "a" | "b" | "cards";
export const SERIES_COLOR: Record<Series, string> = {
  a: "var(--data-cat-2)",
  b: "var(--data-cat-1)",
  cards: "var(--data-cat-3)",
};

const TICK = { fill: "var(--mute)", fontSize: 11, fontFamily: "var(--font-mono)" };
const AXIS = { stroke: "var(--hairline)", tickLine: false, tick: TICK } as const;
const GRID = <CartesianGrid vertical={false} stroke="var(--hairline)" strokeOpacity={0.5} />;
const REF_LABEL = { fill: "var(--mute)", fontSize: 11, fontFamily: "var(--font-mono)" };

export type Point = { n: number; label: string; value: number | null; note?: string; hollow?: boolean };

function Tip({
  active,
  payload,
  format,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  format: (v: number) => string;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p || p.value === null) return null;
  return (
    <div className="rounded-sm border border-hairline bg-bg px-3 py-2 font-mono text-caption">
      <p className="text-mute">{p.label}</p>
      <p className="text-fg">{format(p.value)}</p>
      {p.note && <p className="text-mute">{p.note}</p>}
    </div>
  );
}

function Frame({ height, label, children }: { height: number; label: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full min-w-0 [&_.recharts-surface]:overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

type Ref =
  | { kind: "band"; from: number; to: number; label: string }
  | { kind: "line"; at: number; label: string };

/** Line over sessions/attempts with optional reference band and lines. */
export function TrendChart({
  data,
  series,
  label,
  height = 220,
  domain,
  format = (v) => String(v),
  refs = [],
  step = false,
  area = false,
  ticks,
}: {
  data: Point[];
  series: Series;
  label: string;
  height?: number;
  domain?: [number, number];
  format?: (v: number) => string;
  refs?: Ref[];
  step?: boolean;
  area?: boolean;
  ticks?: number[];
}) {
  const color = SERIES_COLOR[series];
  const refEls = refs.map((r, i) =>
    r.kind === "band" ? (
      <ReferenceArea
        key={i}
        y1={r.from}
        y2={r.to}
        fill="var(--fg)"
        fillOpacity={0.07}
        stroke="none"
        ifOverflow="extendDomain"
        label={{ ...REF_LABEL, value: r.label, position: "insideBottomLeft" }}
      />
    ) : (
      <ReferenceLine
        key={i}
        y={r.at}
        stroke="var(--fg)"
        strokeOpacity={0.45}
        ifOverflow="extendDomain"
        label={{ ...REF_LABEL, value: r.label, position: "insideTopRight" }}
      />
    ),
  );
  const x = <XAxis dataKey="n" {...AXIS} tickFormatter={(n: number) => data[n - 1]?.label ?? ""} minTickGap={24} />;
  const y = <YAxis {...AXIS} axisLine={false} width={36} domain={domain ?? ["auto", "auto"]} ticks={ticks} tickFormatter={format} />;
  const tip = <Tooltip cursor={{ stroke: "var(--hairline)" }} content={<Tip format={format} />} isAnimationActive={false} />;

  if (area) {
    return (
      <Frame height={height} label={label}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {GRID}
          {x}
          {y}
          {refEls}
          {tip}
          <Area
            dataKey="value"
            type={step ? "stepAfter" : "linear"}
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.1}
            isAnimationActive={false}
            activeDot={{ r: 5, fill: color, stroke: "var(--bg)", strokeWidth: 2 }}
          />
        </AreaChart>
      </Frame>
    );
  }

  return (
    <Frame height={height} label={label}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        {GRID}
        {x}
        {y}
        {refEls}
        {tip}
        <Line
          dataKey="value"
          type={step ? "stepAfter" : "linear"}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          connectNulls
          isAnimationActive={false}
          dot={(props: { cx?: number; cy?: number; index?: number; payload?: Point }) => {
            const { cx, cy, index, payload } = props;
            if (cx == null || cy == null || payload?.value == null) return <g key={index} />;
            return (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r={4}
                fill={payload.hollow ? "var(--bg)" : color}
                stroke={payload.hollow ? color : "var(--bg)"}
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ r: 6, fill: color, stroke: "var(--bg)", strokeWidth: 2 }}
        />
      </LineChart>
    </Frame>
  );
}

/** Vertical columns, value on the cap. */
export function ColumnChart({
  data,
  series,
  label,
  height = 180,
  format = (v) => String(v),
  showValues = false,
}: {
  data: Point[];
  series: Series;
  label: string;
  height?: number;
  format?: (v: number) => string;
  showValues?: boolean;
}) {
  const color = SERIES_COLOR[series];
  return (
    <Frame height={height} label={label}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
        {GRID}
        <XAxis dataKey="n" {...AXIS} tickFormatter={(n: number) => data[n - 1]?.label ?? ""} minTickGap={16} />
        <YAxis {...AXIS} axisLine={false} width={36} allowDecimals={false} tickFormatter={format} />
        <Tooltip cursor={{ fill: "var(--tint)" }} content={<Tip format={format} />} isAnimationActive={false} />
        <Bar dataKey="value" fill={color} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {showValues && <LabelList dataKey="value" position="top" style={TICK} formatter={(v) => (v ? format(Number(v)) : "")} />}
        </Bar>
      </BarChart>
    </Frame>
  );
}

/** Horizontal bars for a category breakdown, value at the tip. */
export function BarList({
  data,
  series,
  label,
  format,
  max,
}: {
  data: { name: string; value: number; note?: string }[];
  series: Series;
  label: string;
  format: (v: number) => string;
  max: number;
}) {
  const color = SERIES_COLOR[series];
  const height = data.length * 36 + 8;
  return (
    <Frame height={height} label={label}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap={10}>
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis type="category" dataKey="name" {...AXIS} axisLine={false} width={140} tick={{ ...TICK, fill: "var(--fg)" }} />
        <Tooltip
          cursor={{ fill: "var(--tint)" }}
          isAnimationActive={false}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as { name: string; value: number; note?: string } | undefined;
            if (!active || !p) return null;
            return (
              <div className="rounded-sm border border-hairline bg-bg px-3 py-2 font-mono text-caption">
                <p className="text-mute">{p.name}</p>
                <p className="text-fg">{format(p.value)}</p>
                {p.note && <p className="text-mute">{p.note}</p>}
              </div>
            );
          }}
        />
        <Bar dataKey="value" fill={color} maxBarSize={16} minPointSize={2} radius={[0, 4, 4, 0]} isAnimationActive={false} background={{ fill: "var(--tint)", radius: 4 }}>
          <LabelList dataKey="value" position="right" style={TICK} formatter={(v) => format(Number(v ?? 0))} />
        </Bar>
      </BarChart>
    </Frame>
  );
}
