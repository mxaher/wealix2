// Server-side stub for recharts.
// Replaces recharts in the server/worker bundle to save ~3-5 MB.
// Charts require a browser DOM and client-side JS anyway; returning null on the
// server is correct behaviour — the real recharts bundle loads as a client chunk.
'use strict';

const React = require('react');

// A no-op component that renders nothing on the server
const Null = React.forwardRef(function NullComponent() { return null; });

const namedExports = {
  Area: Null,
  AreaChart: Null,
  Bar: Null,
  BarChart: Null,
  Brush: Null,
  CartesianGrid: Null,
  Cell: Null,
  ComposedChart: Null,
  Funnel: Null,
  FunnelChart: Null,
  Label: Null,
  LabelList: Null,
  Legend: Null,
  Line: Null,
  LineChart: Null,
  Pie: Null,
  PieChart: Null,
  PolarAngleAxis: Null,
  PolarGrid: Null,
  PolarRadiusAxis: Null,
  Radar: Null,
  RadarChart: Null,
  RadialBar: Null,
  RadialBarChart: Null,
  ReferenceDot: Null,
  ReferenceLine: Null,
  ReferenceArea: Null,
  ResponsiveContainer: Null,
  Scatter: Null,
  ScatterChart: Null,
  Sector: Null,
  Tooltip: Null,
  Treemap: Null,
  XAxis: Null,
  YAxis: Null,
  ZAxis: Null,
};

const handler = {
  get(_, key) {
    if (key === '__esModule') return true;
    if (key === 'default') return namedExports;
    if (key in namedExports) return namedExports[key];
    return Null;
  },
};

module.exports = new Proxy(namedExports, handler);
