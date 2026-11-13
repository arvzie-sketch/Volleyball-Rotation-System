/**
 * Movement-arrow geometry and routing, shared by the SVG court (app.js) and the 3D court (court3d.js).
 * Pure maths: no DOM, no three.js. Units are metres on the floor, points are [x, z].
 * Routing ported from the F4 prototype (greedy coordinate descent with seeded restarts).
 */
(function (root) {
  'use strict';

  var BENDS = [0.18, -0.18, 0.3, -0.3, 0.42, -0.42, 0.55, -0.55];
  var START_GAP = 0.75;   // the curve starts this far from the centre of the start circle
  var END_GAP = 0.8;      // and ends this far from the centre of the player token
  var CLEAR = 1.05;       // passing closer than this to another circle centre is penalised
  var NEAR = 0.9;         // two arrows closer than this are penalised
  // Chevron outline, pointing along +x
  var CHEVRON = [[-0.17, -0.3], [0, -0.3], [0.2, 0], [0, 0.3], [-0.17, 0.3], [0.03, 0]];

  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

  // Quadratic curve from circle a to circle b, bent sideways by `bend` (a fraction of the length).
  function curve(a, b, bend) {
    var dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1e-6;
    var c = [(a[0] + b[0]) / 2 - dz / len * len * bend, (a[1] + b[1]) / 2 + dx / len * len * bend];
    var d1 = dist(c, a) || 1e-6, d2 = dist(b, c) || 1e-6;
    return {
      s: [a[0] + (c[0] - a[0]) / d1 * START_GAP, a[1] + (c[1] - a[1]) / d1 * START_GAP],
      c: c,
      e: [b[0] - (b[0] - c[0]) / d2 * END_GAP, b[1] - (b[1] - c[1]) / d2 * END_GAP]
    };
  }

  function pointAt(cv, t) {
    var u = 1 - t;
    return [u * u * cv.s[0] + 2 * u * t * cv.c[0] + t * t * cv.e[0],
            u * u * cv.s[1] + 2 * u * t * cv.c[1] + t * t * cv.e[1]];
  }

  function tangentAt(cv, t) {
    var x = (1 - t) * (cv.c[0] - cv.s[0]) + t * (cv.e[0] - cv.c[0]);
    var z = (1 - t) * (cv.c[1] - cv.s[1]) + t * (cv.e[1] - cv.c[1]);
    var l = Math.hypot(x, z) || 1e-6;
    return [x / l, z / l];
  }

  function sample(cv, n) {
    var out = [];
    for (var i = 0; i <= n; i++) out.push(pointAt(cv, i / n));
    return out;
  }

  // The part of the curve from 0 to t, as a curve of its own
  function head(cv, t) {
    return { s: cv.s, c: [cv.s[0] + (cv.c[0] - cv.s[0]) * t, cv.s[1] + (cv.c[1] - cv.s[1]) * t], e: pointAt(cv, t) };
  }

  // Arc length and a lookup from distance along the curve to the parameter t
  function measure(cv) {
    var N = 48, pts = sample(cv, N), cum = [0];
    for (var i = 1; i <= N; i++) cum.push(cum[i - 1] + dist(pts[i], pts[i - 1]));
    var total = cum[N];
    return {
      length: total,
      tAt: function (d) {
        if (d <= 0) return 0;
        if (d >= total) return 1;
        var j = 1;
        while (cum[j] < d) j++;
        return (j - 1 + (d - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1e-6)) / N;
      }
    };
  }

  // Chevrons along the curve: they grow and get more opaque towards the destination
  function chevrons(cv) {
    var m = measure(cv), L = m.length, gap = 0.46, cnt = Math.max(2, Math.floor((L - 0.2) / gap)), out = [];
    for (var q = 0; q < cnt; q++) {
      var tt = q / (cnt - 1), d = L - 0.24 - (cnt - 1 - q) * gap;
      if (d < 0.1) continue;
      var t = m.tAt(d);
      out.push({ p: pointAt(cv, t), t: tangentAt(cv, t), fade: 0.3 + 0.7 * tt, scale: 0.75 + 0.4 * tt });
    }
    return out;
  }

  function segX(p1, p2, p3, p4) {
    function o(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
    return o(p3, p4, p1) * o(p3, p4, p2) < 0 && o(p1, p2, p3) * o(p1, p2, p4) < 0;
  }

  function pairCost(A, B) {
    var n = 0, i, j, md = 99;
    for (i = 0; i < A.length - 1; i++) for (j = 0; j < B.length - 1; j++) if (segX(A[i], A[i + 1], B[j], B[j + 1])) n++;
    for (i = 0; i < A.length; i++) for (j = 0; j < B.length; j++) { var d = dist(A[i], B[j]); if (d < md) md = d; }
    return n * 40 + (md < NEAR ? (NEAR - md) * 30 : 0);
  }

  /**
   * Choose a bend for every arrow. specs: [{ a: [x,z], b: [x,z] }]; fixed: circle centres to avoid.
   * Sets spec.bend on each spec.
   */
  function route(specs, fixed) {
    var n = specs.length;
    if (!n) return;
    var polys = specs.map(function (sp) {
      return BENDS.map(function (bd) { return sample(curve(sp.a, sp.b, bd), 20); });
    });
    var ownMemo = {}, pairMemo = {};

    function own(i, oi) {
      var key = i + '.' + oi;
      if (ownMemo[key] !== undefined) return ownMemo[key];
      var P = polys[i][oi], c = Math.abs(BENDS[oi]) * 5, obs = fixed.slice(), j, k, m;
      for (j = 0; j < n; j++) if (j !== i) { obs.push(specs[j].a); obs.push(specs[j].b); }
      for (k = 0; k < obs.length; k++) {
        for (m = 0; m < P.length; m++) { if (dist(P[m], obs[k]) < CLEAR) { c += 15; break; } }
      }
      return (ownMemo[key] = c);
    }
    function pair(i, oi, j, oj) {
      var key = i < j ? i + '.' + oi + '.' + j + '.' + oj : j + '.' + oj + '.' + i + '.' + oi;
      if (pairMemo[key] === undefined) pairMemo[key] = pairCost(polys[i][oi], polys[j][oj]);
      return pairMemo[key];
    }

    var pickd = [], best = null, bestC = 1e9, seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function cost(i, oi) {
      var c = own(i, oi);
      for (var j = 0; j < n; j++) if (j !== i) c += pair(i, oi, j, pickd[j]);
      return c;
    }
    function total() {
      var c = 0, i, j;
      for (i = 0; i < n; i++) { c += own(i, pickd[i]); for (j = i + 1; j < n; j++) c += pair(i, pickd[i], j, pickd[j]); }
      return c;
    }

    for (var r = 0; r < 8; r++) {
      for (var s = 0; s < n; s++) pickd[s] = r === 0 ? 0 : Math.floor(rnd() * BENDS.length);
      for (var pass = 0; pass < 5; pass++) {
        var changed = false;
        for (var i = 0; i < n; i++) {
          var bi = pickd[i], bc = cost(i, bi);
          for (var oi = 0; oi < BENDS.length; oi++) { var cc = cost(i, oi); if (cc < bc - 0.001) { bc = cc; bi = oi; } }
          if (bi !== pickd[i]) { pickd[i] = bi; changed = true; }
        }
        if (!changed) break;
      }
      var tc = total();
      if (tc < bestC) { bestC = tc; best = pickd.slice(); }
    }
    specs.forEach(function (sp, i) { sp.bend = BENDS[best[i]]; });
  }

  var api = { BENDS: BENDS, CHEVRON: CHEVRON, curve: curve, pointAt: pointAt, tangentAt: tangentAt,
              sample: sample, head: head, measure: measure, chevrons: chevrons, route: route };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VRSRouting = api;
})(typeof self !== 'undefined' ? self : this);
