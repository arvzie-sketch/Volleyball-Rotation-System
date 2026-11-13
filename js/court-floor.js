/**
 * Hardwood floor for the 2D (SVG) court. The same plank algorithm and seeds as the 3D court's
 * wood textures (js/court3d.js woodTex), drawn as SVG rectangles so 2D and 3D show the same floor.
 * Everything is built with createElementNS; no HTML strings, no canvas, no image files.
 */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var U = 250 / 9;                 // SVG units per metre
  var COURT = { x: 25, y: 32, w: 250, h: 250 };

  // The 3D floor is lit (hemisphere + ambient + sun), which lifts and brightens the plank colours.
  // These per-channel factors (out = base * a + s per channel) were fitted against the 3D top-down
  // view so the flat SVG floor matches it.
  var TONE = { court: { a: 1, s: [34, 48, 41] }, free: { a: 1.38, s: [17, 17, 17] }, far: { a: 0.72, s: [49, 29, 28] } };

  function hsl(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var c = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return [c(0) * 255, c(8) * 255, c(4) * 255];
  }
  function tone(rgb, t) {
    return 'rgb(' + rgb.map(function (v, i) { return Math.round(Math.max(0, Math.min(255, v * t.a + t.s[i]))); }).join(',') + ')';
  }

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function f(n) { return Math.round(n * 100) / 100; }

  // One wood texture laid on the rectangle `box`, showing only what falls inside `clip`.
  // Mirrors woodTex(): n planks across, cut into segments of random length and shade.
  function planks(parent, box, n, hue, sat, lig, vr, seed, clip, tn) {
    var S = 1024, r = seed;
    function R() { r = (r * 16807) % 2147483647; return r / 2147483647; }
    var pw = box.w / n, ky = box.h / S;
    var g = el('g', { 'shape-rendering': 'crispEdges' }, parent);
    var grain = [], seams = [], gaps = [];
    for (var i = 0; i < n; i++) {
      var x = box.x + i * pw, y = 0;
      var colIn = x + pw > clip.x0 && x < clip.x1;
      while (y < S) {
        var len = Math.min(S - y, S * (0.25 + R() * 0.5));
        var L = lig + (R() - 0.5) * vr;
        var gx = [];
        for (var k = 0; k < 3; k++) { var a = R(), b = R(); gx.push([x + a * pw, (b - 0.5) * 3 * (box.w / S)]); }
        var y0 = box.y + y * ky, y1 = y0 + len * ky;
        if (colIn && y1 > clip.y0 && y0 < clip.y1) {
          var cy0 = Math.max(y0, clip.y0), cy1 = Math.min(y1, clip.y1);
          var cx0 = Math.max(x, clip.x0), cx1 = Math.min(x + pw + 0.3, clip.x1);
          el('rect', { x: f(cx0), y: f(cy0), width: f(cx1 - cx0), height: f(cy1 - cy0 + 0.2),
            fill: tone(hsl(hue, sat, L), tn) }, g);
          gx.forEach(function (p) { grain.push('M' + f(p[0]) + ' ' + f(cy0) + 'L' + f(p[0] + p[1]) + ' ' + f(cy1)); });
          if (y0 >= clip.y0) seams.push('M' + f(cx0) + ' ' + f(y0) + 'h' + f(cx1 - cx0));
        }
        y += len;
      }
      if (colIn) gaps.push('M' + f(Math.max(x, clip.x0)) + ' ' + f(clip.y0) + 'V' + f(clip.y1));
    }
    el('path', { d: grain.join(''), fill: 'none', stroke: '#000', 'stroke-opacity': '0.08', 'stroke-width': f(box.w / S * 1) }, g);
    el('path', { d: seams.join(''), fill: 'none', stroke: '#000', 'stroke-opacity': '0.3', 'stroke-width': f(ky) }, g);
    el('path', { d: gaps.join(''), fill: 'none', stroke: '#000', 'stroke-opacity': '0.28', 'stroke-width': f(box.w / S) }, g);
    return g;
  }

  // Fill `parent` (an SVG <g>) with the floor, tints, court lines and net posts.
  function build(parent) {
    parent.textContent = '';
    var VB = { x0: 0, y0: 0, x1: 300, y1: 320 };
    // Free zone: a 15 x 25 m floor, centred on the court
    planks(parent, { x: 150 - 7.5 * U, y: COURT.y + (-17 + 4.5) * U, w: 15 * U, h: 25 * U },
      70, 205, 16, 16, 3, 7, VB, TONE.free);
    // Far half of the court (dimmer), only the strip above the net is in view
    planks(parent, { x: COURT.x, y: COURT.y - 250, w: 250, h: 250 },
      50, 21, 70, 50, 6, 13, { x0: COURT.x, y0: 0, x1: COURT.x + 250, y1: COURT.y }, TONE.far);
    // Our half
    planks(parent, COURT, 50, 21, 70, 50, 6, 13,
      { x0: COURT.x, y0: COURT.y, x1: COURT.x + 250, y1: COURT.y + 250 }, TONE.court);

    // Front-zone tint (net to attack line), on both halves
    el('rect', { x: COURT.x, y: 0, width: 250, height: f(COURT.y + 3 * U), fill: '#fff', 'fill-opacity': '0.07' }, parent);

    // Lines
    var lw = f(0.05 * U), line = { stroke: '#fff', fill: 'none' };
    el('path', { d: 'M' + COURT.x + ' 0V' + (COURT.y + 250) + 'H' + (COURT.x + 250) + 'V0', stroke: '#fff', fill: 'none', 'stroke-width': lw, 'stroke-linejoin': 'miter' }, parent);
    el('line', { x1: COURT.x, x2: COURT.x + 250, y1: f(COURT.y + 3 * U), y2: f(COURT.y + 3 * U), stroke: '#fff', 'stroke-width': f(0.04 * U) }, parent);
    // Net at the centre line: tape and the posts just outside the sidelines
    el('line', { x1: f(150 - 5 * U), x2: f(150 + 5 * U), y1: COURT.y, y2: COURT.y, stroke: '#fff', 'stroke-width': '1.8' }, parent);
    [-1, 1].forEach(function (s) {
      el('circle', { cx: f(150 + s * 5 * U), cy: COURT.y, r: '2.1', fill: '#c4cbd1' }, parent);
    });
  }

  root.VRSFloor = { build: build, TONE: TONE };
})(typeof self !== 'undefined' ? self : this);
