/**
 * 3D court for the viewer. Loaded on demand by app.js after assets/vendor/three-r128.min.js.
 * Scene, figures and camera are ported from the F4 prototype. Arrow geometry comes from
 * js/arrow-routing.js so the 3D arrows match the SVG ones.
 * World units are metres: x across the court, z from the net (-4.5) to our baseline (+4.5).
 */
(function () {
  'use strict';

  var FOV = 32, FLAT_EL = 89.9, TILT_EL = 38;
  var M = 9 / 250;                        // metres per SVG viewBox unit
  var SKIN_Z = (160 - 32) * M - 4.5;      // world z under the centre of the SVG viewBox (300 x 320)
  var YELLOW = 0xffc93c;
  var DIM = 0.35;

  function create(opts) {
    var THREE = window.THREE, R = window.VRSRouting;
    var stage = opts.stage, canvas = opts.canvas;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });   // throws without WebGL
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x15191d);
    var camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);

    // ---- Lights (prototype L217-L219) ----
    scene.add(new THREE.HemisphereLight(0xdfe9f2, 0x1a2026, 0.72)); scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    var sun = new THREE.DirectionalLight(0xfff4e6, 0.8); sun.position.set(-5, 12, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); var sc = sun.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40; scene.add(sun);

    // ---- Floors and lines (prototype L221-L257) ----
    function woodTex(hue, sat, lig, vr, n, seed) {
      var S = 1024, c = document.createElement('canvas'); c.width = c.height = S; var g = c.getContext('2d');
      var r = seed; function Rn() { r = (r * 16807) % 2147483647; return r / 2147483647; }
      var pw = S / n;
      for (var i = 0; i < n; i++) {
        var y = 0;
        while (y < S) {
          var len = Math.min(S - y, S * (0.25 + Rn() * 0.5));
          var L = lig + (Rn() - 0.5) * vr;
          g.fillStyle = 'hsl(' + hue + ',' + sat + '%,' + L + '%)'; g.fillRect(i * pw, y, pw + 1, len);
          g.globalAlpha = 0.08; g.strokeStyle = '#000'; g.lineWidth = 1;
          for (var k = 0; k < 3; k++) { var gx = i * pw + Rn() * pw; g.beginPath(); g.moveTo(gx, y); g.lineTo(gx + (Rn() - 0.5) * 3, y + len); g.stroke(); }
          g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(i * pw, y, pw, 1); g.globalAlpha = 1;
          y += len;
        }
        g.globalAlpha = 0.28; g.fillStyle = '#000'; g.fillRect(i * pw, 0, 1, S); g.globalAlpha = 1;
      }
      var t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
    }
    var gtex = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d');
      var gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#1d252c'); gr.addColorStop(0.45, '#171d22'); gr.addColorStop(1, '#15191d');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
    })();
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshBasicMaterial({ map: gtex }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; scene.add(ground);
    var fz = new THREE.Mesh(new THREE.PlaneGeometry(15, 25), new THREE.MeshStandardMaterial({ map: woodTex(205, 16, 16, 3, 70, 7), roughness: 0.55, metalness: 0 }));
    fz.rotation.x = -Math.PI / 2; fz.position.y = -0.006; fz.position.z = -4.5; fz.receiveShadow = true; scene.add(fz);
    var court = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: woodTex(21, 70, 50, 6, 50, 13), roughness: 0.4, metalness: 0 }));
    court.rotation.x = -Math.PI / 2; court.receiveShadow = true; scene.add(court);
    var zone = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false }));
    zone.rotation.x = -Math.PI / 2; zone.position.set(0, 0.006, -3); scene.add(zone);
    var white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    function strip(w, d, x, z) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), white); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); scene.add(m); }
    strip(9.05, 0.05, 0, -4.5); strip(9.05, 0.05, 0, 4.5); strip(0.05, 9.05, -4.5, 0); strip(0.05, 9.05, 4.5, 0); strip(9, 0.04, 0, -1.5);
    var far = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: court.material.map, color: 0xa4a4a4, roughness: 0.45, metalness: 0 }));
    far.rotation.x = -Math.PI / 2; far.position.set(0, 0, -9); far.receiveShadow = true; scene.add(far);
    var zone2 = zone.clone(); zone2.position.z = -6; scene.add(zone2);
    strip(9.05, 0.05, 0, -13.5); strip(0.05, 9.05, -4.5, -9); strip(0.05, 9.05, 4.5, -9); strip(9, 0.04, 0, -7.5);

    // ---- Zone numbers: same spots and size as the SVG labels ----
    var numGroup = new THREE.Group();
    scene.add(numGroup);
    function numTex(t) {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d');
      g.fillStyle = 'rgba(255,255,255,0.2)';
      g.font = '700 69px Barlow, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(t, 64, 66);
      return new THREE.CanvasTexture(c);
    }
    [['4', 67, 70], ['3', 150, 70], ['2', 233, 70], ['5', 67, 202], ['6', 150, 202], ['1', 233, 202]].forEach(function (n) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshBasicMaterial({ map: numTex(n[0]), transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set((n[1] - 150) * M, 0.014, (n[2] - 32) * M - 4.5);
      m.renderOrder = 0.6;
      numGroup.add(m);
    });

    // ---- Net (prototype L268-L286; everything goes into netGroup) ----
    var netGroup = new THREE.Group();
    scene.add(netGroup);
    var NETW = 10.0, NETZ = -4.5, NETTOP = 2.43, NETH = 1.0;
    var netTex = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d');
      g.fillStyle = 'rgba(8,10,12,0.5)'; g.fillRect(0, 0, 32, 32); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.strokeRect(0, 0, 32, 32);
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(NETW / 0.2, NETH / 0.2); t.anisotropy = 4; return t;
    })();
    var net = new THREE.Mesh(new THREE.PlaneGeometry(NETW, NETH), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    net.position.set(0, NETTOP - NETH / 2 - 0.04, NETZ); netGroup.add(net);
    var tape = new THREE.Mesh(new THREE.BoxGeometry(NETW, 0.09, 0.03), white); tape.position.set(0, NETTOP - 0.045, NETZ); netGroup.add(tape);
    var tape2 = new THREE.Mesh(new THREE.BoxGeometry(NETW, 0.05, 0.03), white); tape2.position.set(0, NETTOP - NETH - 0.02, NETZ); netGroup.add(tape2);
    var postMat = new THREE.MeshLambertMaterial({ color: 0xb9c1c8 });
    [-1, 1].forEach(function (s) {
      var p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.55, 14), postMat); p.position.set(s * (NETW / 2), 1.275, NETZ); p.castShadow = true; netGroup.add(p);
      var st = new THREE.Mesh(new THREE.BoxGeometry(0.05, NETH, 0.035), white); st.position.set(s * 4.5, NETTOP - NETH / 2 - 0.04, NETZ); netGroup.add(st);
    });
    var antTex = (function () {
      var c = document.createElement('canvas'); c.width = 8; c.height = 80; var g = c.getContext('2d');
      for (var i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#d62828'; g.fillRect(0, i * 10, 8, 10); } return new THREE.CanvasTexture(c);
    })();
    [-1, 1].forEach(function (s) {
      var a = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.8, 10), new THREE.MeshBasicMaterial({ map: antTex }));
      a.position.set(s * 4.5, NETTOP + 0.4, NETZ); netGroup.add(a);
    });

    // ---- Flat skin: a canvas copy of the 2D SVG court. Opaque when the camera is top-down, so the
    //      swap from the SVG is seamless; fades into the hardwood as the camera tilts. ----
    var skin = (function () {
      var S = 4, c = document.createElement('canvas'); c.width = 300 * S; c.height = 320 * S;
      var g = c.getContext('2d'); g.scale(S, S);
      g.fillStyle = '#2f5d6b'; g.fillRect(0, 0, 300, 320);                    // surround
      g.fillStyle = '#0b0f13'; g.fillRect(25, 12, 250, 18);                   // net band
      g.fillStyle = 'rgba(255,255,255,0.4)';                                  // mesh (matches the SVG pattern)
      for (var x = 30; x < 275; x += 6) g.fillRect(x, 14.5, 0.35, 15.5);
      for (var y = 18; y < 30; y += 6) g.fillRect(25, y, 250, 0.35);
      g.fillStyle = '#ffffff'; g.fillRect(25, 12, 250, 2.5);                  // top tape
      g.font = '700 8.5px Barlow, sans-serif'; g.textAlign = 'center';
      if ('letterSpacing' in g) { g.letterSpacing = '3px'; g.fillText('NET', 150, 25.5); g.letterSpacing = '0px'; }
      else ['N', 'E', 'T'].forEach(function (ch, i) { g.fillText(ch, 140.5 + i * 8.3, 25.5); });
      g.fillStyle = '#d8703b'; g.fillRect(25, 32, 250, 250);                  // court
      g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.strokeRect(25, 32, 250, 250);
      g.lineWidth = 2; g.beginPath(); g.moveTo(25, 115); g.lineTo(275, 115); g.stroke();   // attack line
      g.globalAlpha = 0.65; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.beginPath();
      g.moveTo(8, 115); g.lineTo(25, 115); g.moveTo(275, 115); g.lineTo(292, 115); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(8, 32); g.lineTo(292, 32); g.stroke();    // centre line
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(3, 200, 18, 100);          // bench strip
      var tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
      var m = new THREE.Mesh(new THREE.PlaneGeometry(300 * M, 320 * M),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.02, SKIN_Z);
      m.renderOrder = 0.5;
      scene.add(m);
      return m;
    })();

    // ---- Figures ----
    var figs = Object.create(null), sel = null;

    // Token face, sized so that at the top-down pose it matches the SVG token (r 18 + 1.5 ring)
    function labelCanvas(txt, bg, fg, ring) {
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var g = c.getContext('2d');
      g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fillStyle = ring; g.fill();
      g.beginPath(); g.arc(128, 128, 114, 0, Math.PI * 2); g.fillStyle = bg; g.fill();
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 89px Barlow, sans-serif';
      var w = g.measureText(txt).width;
      if (w > 196) g.font = '700 ' + Math.floor(89 * 196 / w) + 'px Barlow, sans-serif';   // long custom labels
      g.fillText(txt, 128, 134);
      return c;
    }

    // Human figure + flat token (prototype L295-L332 with the changes listed in the plan)
    function figure(pl) {
      var label = String(pl.label);
      var kind = pl.isLibero ? 'l' : (pl.role === 'setter' ? 's' : 'p');
      var shirt = kind === 's' ? YELLOW : kind === 'l' ? 0xf2f4f5 : 0x1b1f24;
      var trim = kind === 'p' ? 0xffffff : 0x15181c;
      var skinC = 0xe3b08d, shorts = 0x0e1114;
      var g = new THREE.Group(); var body = new THREE.Group(); g.add(body);
      function Mk(geo, col, x, y, z) { var m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col })); m.position.set(x, y, z); m.castShadow = true; body.add(m); return m; }
      [-1, 1].forEach(function (s) {
        Mk(new THREE.CylinderGeometry(0.075, 0.065, 0.5, 12), skinC, s * 0.1, 0.27, 0);
        Mk(new THREE.CylinderGeometry(0.095, 0.085, 0.42, 12), shorts, s * 0.1, 0.68, 0);
        Mk(new THREE.BoxGeometry(0.12, 0.07, 0.26), 0xffffff, s * 0.1, 0.035, -0.05);
      });
      var torso = Mk(new THREE.CylinderGeometry(0.2, 0.17, 0.6, 16), shirt, 0, 1.13, 0); torso.scale.z = 0.62;
      var stripe = Mk(new THREE.CylinderGeometry(0.205, 0.205, 0.07, 16, 1, true), trim, 0, 1.2, 0); stripe.scale.z = 0.62;
      Mk(new THREE.CylinderGeometry(0.05, 0.055, 0.07, 10), skinC, 0, 1.47, 0);
      Mk(new THREE.SphereGeometry(0.115, 18, 14), skinC, 0, 1.6, 0);
      Mk(new THREE.SphereGeometry(0.122, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), 0x2a2118, 0, 1.61, 0.012);
      [-1, 1].forEach(function (s) {
        var pivot = new THREE.Group(); pivot.position.set(s * 0.255, 1.38, 0); pivot.rotation.x = 0.55; pivot.rotation.z = s * 0.1;
        var sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.18, 10), new THREE.MeshLambertMaterial({ color: shirt })); sleeve.position.y = -0.09; sleeve.castShadow = true; pivot.add(sleeve);
        var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.46, 10), new THREE.MeshLambertMaterial({ color: skinC })); arm.position.y = -0.41; arm.castShadow = true; pivot.add(arm);
        body.add(pivot);
      });
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; body.add(ring);
      var bg = kind === 's' ? '#ffc93c' : kind === 'l' ? '#ffffff' : '#101316', fg = kind === 'p' ? '#ffffff' : '#101316';
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(labelCanvas(label, bg, fg, '#ffffff')), depthTest: false, transparent: true }));
      spr.scale.set(0.9, 0.9, 1); spr.position.y = 2.35; spr.renderOrder = 10; body.add(spr);
      var disc = new THREE.Mesh(new THREE.CircleGeometry(0.622, 40), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas(label, bg, fg, '#ffffff')), transparent: true, opacity: 0, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.05; disc.renderOrder = 5; disc.visible = false; g.add(disc);
      g.scale.setScalar(1.12);
      scene.add(g);
      body.userData.pid = pl.id; disc.userData.pid = pl.id;
      var mats = []; body.traverse(function (n) { if (n.material && n !== spr) mats.push(n.material); });
      var selRing = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.725, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
      selRing.rotation.x = -Math.PI / 2; selRing.position.y = 0.07; selRing.renderOrder = 6; selRing.visible = false; g.add(selRing);
      // Tap target: covers body and floating label, stays put while the body squashes
      var proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.6, 12), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.y = 1.3; proxy.userData.pid = pl.id; g.add(proxy);
      return { g: g, body: body, spr: spr, disc: disc, proxy: proxy, mats: mats, selRing: selRing,
               dim: 1, cur: null, goal: [0, 0], on: true, bench: false };
    }

    function disposeTree(o) {
      o.traverse(function (n) {
        if (n.geometry && n.geometry !== chevGeo) n.geometry.dispose();
        if (n.material && !n.material._shared) {
          if (n.material.map && !n.material.map._shared) n.material.map.dispose();
          n.material.dispose();
        }
      });
    }

    function setPlayers(players) {
      Object.keys(figs).forEach(function (id) { scene.remove(figs[id].g); disposeTree(figs[id].g); });
      figs = Object.create(null);
      clearOverlay();
      Object.keys(ghostTex).forEach(function (k) { ghostTex[k].dispose(); });
      ghostTex = Object.create(null);
      (players || []).forEach(function (pl) { figs[pl.id] = figure(pl); });
      invalidate();
    }

    // ---- Start circles and arrows ----
    var overlay = new THREE.Group(); scene.add(overlay);
    var arrowMats = {}, ghostTex = Object.create(null);
    var chevGeo = (function () {
      var s = new THREE.Shape();
      R.CHEVRON.forEach(function (p, i) { if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); });
      s.closePath();
      return new THREE.ShapeGeometry(s);
    })();

    function clearOverlay() {
      while (overlay.children.length) { var o = overlay.children[0]; overlay.remove(o); disposeTree(o); }
    }

    function ghost(id, label, setter, x, z) {
      var key = id + '|' + label + '|' + (setter ? 1 : 0);
      if (!ghostTex[key]) {
        var c = document.createElement('canvas'); c.width = c.height = 128;
        var g = c.getContext('2d');
        g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.arc(64, 64, 60, 0, 6.2832); g.fill();
        g.globalAlpha = 0.85; g.strokeStyle = setter ? '#ffc93c' : '#ffffff'; g.lineWidth = 4; g.setLineDash([10, 8]);
        g.beginPath(); g.arc(64, 64, 58, 0, 6.2832); g.stroke();
        g.setLineDash([]); g.globalAlpha = 0.7; g.fillStyle = '#ffffff';
        g.font = '700 35px Barlow, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(label, 64, 67);
        ghostTex[key] = new THREE.CanvasTexture(c);
        ghostTex[key]._shared = true;
      }
      var m = new THREE.Mesh(new THREE.CircleGeometry(0.717, 40),
        new THREE.MeshBasicMaterial({ map: ghostTex[key], transparent: true, opacity: 0.95, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); m.renderOrder = 1; m.userData.ghost = true;
      overlay.add(m);
    }

    function arrowMat(col, alpha) {
      var m = arrowMats[col];
      if (!m) {
        m = arrowMats[col] = new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false });
        m._shared = true;
      }
      m.opacity = alpha;
      return m;
    }

    function drawArrow(a, style, alpha) {
      var cv = R.curve(a.a, a.b, a.bend), col = a.setter ? YELLOW : 0xffffff;
      function v(p) { return new THREE.Vector3(p[0], 0.06, p[1]); }

      if (style === 'chevron') {
        R.chevrons(cv).forEach(function (ch) {
          var cm = new THREE.Mesh(chevGeo, new THREE.MeshBasicMaterial(
            { color: col, transparent: true, opacity: alpha * ch.fade, depthWrite: false, side: THREE.DoubleSide }));
          cm.rotation.x = -Math.PI / 2; cm.renderOrder = 2;   // above the flat skin (0.5) and the start circles (1)
          var grp = new THREE.Group(); grp.add(cm);
          grp.position.set(ch.p[0], 0.065, ch.p[1]);
          grp.rotation.y = Math.atan2(-ch.t[1], ch.t[0]);
          grp.scale.setScalar(ch.scale);
          overlay.add(grp);
        });
        return;
      }

      var body = R.head(cv, 0.92), mat = arrowMat(col, alpha);
      var curve = new THREE.QuadraticBezierCurve3(v(body.s), v(body.c), v(body.e));
      if (style === 'solid') {
        var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.055, 8, false), mat); tube.renderOrder = 2; overlay.add(tube);
      } else {
        var L = curve.getLength(), d = 0;
        while (d < L - 0.05) {
          var u0 = d / L, u1 = Math.min(L, d + 0.34) / L, p = [];
          for (var k = 0; k <= 3; k++) p.push(curve.getPointAt(u0 + (u1 - u0) * k / 3));
          var dash = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 3, 0.055, 5, false), mat); dash.renderOrder = 2; overlay.add(dash);
          d += 0.56;
        }
      }
      var t = R.tangentAt(cv, 1), tan = new THREE.Vector3(t[0], 0, t[1]);
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 16), mat);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      cone.position.set(cv.e[0], 0.07, cv.e[1]).addScaledVector(tan, -0.25);
      cone.position.y = 0.07; cone.renderOrder = 2;
      overlay.add(cone);
    }

    function setScene(s) {
      Object.keys(figs).forEach(function (id) {
        var f = figs[id], w = s.pos[id];
        f.bench = !!s.benched[id];
        f.on = !!w && (s.showBench || !f.bench);
        f.g.visible = f.on;
        if (!w) return;
        if (!f.cur || !s.duration) { f.cur = [w[0], w[1]]; f.goal = w; f.t0 = undefined; }
        else if (Math.abs(f.goal[0] - w[0]) + Math.abs(f.goal[1] - w[1]) > 0.001) {
          f.from = [f.cur[0], f.cur[1]]; f.t0 = performance.now(); f.dur = s.duration; f.goal = w;
        }
      });
      sel = s.sel;
      numGroup.visible = s.showZones;
      clearOverlay();
      if (s.movement) {
        s.movement.ghosts.forEach(function (gh) { ghost(gh.id, gh.label, gh.setter, gh.at[0], gh.at[1]); });
        s.movement.arrows.forEach(function (a) { drawArrow(a, s.style, s.alpha); });
      }
      invalidate();
    }

    // ---- Camera ----
    var rig = { az: 0, el: FLAT_EL, dist: 30, tz: SKIN_Z }, goal = { az: 0, el: FLAT_EL, dist: 30, tz: SKIN_Z };
    var view = 'flat', fitT = { d: 30, tz: -3 }, flat = { d: 30, tz: SKIN_Z }, onSettled = null;
    var tmp = new THREE.Vector3();

    // Prototype L487-L506
    function camSet(az, el, d, tz) {
      var a = az * Math.PI / 180, e = el * Math.PI / 180;
      camera.position.set(d * Math.sin(a) * Math.cos(e), 0.2 + d * Math.sin(e), tz + d * Math.cos(a) * Math.cos(e));
      camera.up.set(0, 1, 0); camera.lookAt(0, 0.2, tz); camera.updateMatrixWorld(true);
    }
    function pts(list) { return list.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }); }
    var TILT_PTS = pts([[-5.3, 0, -13.5], [5.3, 0, -13.5], [-5.3, 0, 5.3], [5.3, 0, 5.3], [-5.2, 2.8, -4.5], [5.2, 2.8, -4.5], [-4.8, 2.9, 5], [4.8, 2.9, 5]]);
    function fits(list, el, mx, my) {
      var best = { d: 90, tz: -3 };
      for (var tz = -7; tz <= 1; tz += 0.5) {
        for (var d = 10; d <= 90; d += 0.5) {
          camSet(0, el, d, tz);
          var ok = true;
          for (var i = 0; i < list.length; i++) { tmp.copy(list[i]).project(camera); if (Math.abs(tmp.x) > mx || Math.abs(tmp.y) > my || tmp.z > 1) { ok = false; break; } }
          if (ok) { if (d < best.d) best = { d: d, tz: tz }; break; }
        }
      }
      return best;
    }

    // Top-down pose that shows the court at exactly the place and size of the SVG
    function alignFlat() {
      var svg = opts.getSvgRect && opts.getSvgRect(), st = stage.getBoundingClientRect();
      if (!svg || !svg.width || !st.height) return;
      var unit = svg.width / 300;                                           // CSS px per viewBox unit
      var H = st.height / (2 * Math.tan(FOV * Math.PI / 360) * (unit / M)); // camera height for that scale
      var vbY = 160 + ((st.top + st.height / 2) - (svg.top + svg.height / 2)) / unit;
      flat.d = H - 0.2;
      flat.tz = (vbY - 32) * M - 4.5;
    }

    function applyView() {
      if (view === 'flat') { goal.az = 0; goal.el = FLAT_EL; goal.dist = flat.d; goal.tz = flat.tz; }
      else if (view === 'tilt') { goal.az = 0; goal.el = TILT_EL; goal.dist = fitT.d; goal.tz = fitT.tz; }
    }

    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      fitT = fits(TILT_PTS, TILT_EL, 0.96, 0.94);
      alignFlat();
      applyView();
      invalidate();
    }

    function settled() { if (onSettled) { var cb = onSettled; onSettled = null; cb(); } }

    function setView(v, o) {
      o = o || {};
      settled();                                                  // never leave an earlier caller waiting
      view = v;
      rig.az = ((rig.az + 180) % 360 + 360) % 360 - 180;          // shortest way back after orbiting
      alignFlat();
      applyView();
      if (o.instant) {
        rig.az = goal.az; rig.el = goal.el; rig.dist = goal.dist; rig.tz = goal.tz;
        draw(performance.now());
        if (o.onDone) o.onDone();
        return;
      }
      onSettled = o.onDone || null;
      invalidate();
    }

    // ---- Input: drag orbits, pinch / wheel zooms, tap selects ----
    var ptrs = {}, lastD = 0, ray = new THREE.Raycaster(), listeners = [];
    function on(type, fn, o) { canvas.addEventListener(type, fn, o); listeners.push([type, fn, o]); }
    on('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: Date.now(), moved: false, n: Object.keys(ptrs).length };
      lastD = 0;
    });
    on('pointerup', function (e) {
      var p = ptrs[e.pointerId]; delete ptrs[e.pointerId]; lastD = 0;
      if (p && !p.moved && p.n === 0 && Date.now() - p.t < 500 && Object.keys(ptrs).length === 0) pick(e.clientX, e.clientY);
    });
    on('pointercancel', function (e) { delete ptrs[e.pointerId]; lastD = 0; });
    on('pointermove', function (e) {
      var p = ptrs[e.pointerId]; if (!p) return;
      var ids = Object.keys(ptrs);
      if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 6) p.moved = true;
      if (ids.length === 1 && p.moved) {
        goal.az -= (e.clientX - p.x) * 0.4;
        goal.el = Math.max(12, Math.min(FLAT_EL, goal.el + (e.clientY - p.y) * 0.35));
        rig.az = goal.az; rig.el = goal.el; view = 'custom';
      }
      p.x = e.clientX; p.y = e.clientY;
      if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastD) goal.dist = Math.max(8, Math.min(60, goal.dist * (lastD / d)));
        lastD = d; view = 'custom';
      }
      invalidate();
    });
    on('wheel', function (e) {
      e.preventDefault();
      goal.dist = Math.max(8, Math.min(60, goal.dist * (1 + e.deltaY * 0.001)));
      view = 'custom'; invalidate();
    }, { passive: false });

    function morphK() { var k = Math.min(1, Math.max(0, (rig.el - 52) / 30)); return k * k * (3 - 2 * k); }

    function pick(cx, cy) {
      var r = canvas.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
      var flatNow = morphK() > 0.5, list = [];
      Object.keys(figs).forEach(function (id) { var f = figs[id]; if (f.on) list.push(flatNow ? f.disc : f.proxy); });
      var hits = ray.intersectObjects(list, false);
      opts.onPick(hits.length ? hits[0].object.userData.pid : null);
    }

    // ---- Render on demand ----
    var running = false, dead = false, last = 0;
    function invalidate() { if (!running && !dead) { running = true; last = 0; requestAnimationFrame(loop); } }

    function draw(now) {
      var moving = false, dt = last ? Math.min(100, now - last) : 16.7;
      last = now;
      var a = 1 - Math.pow(0.88, dt / 16.667);            // same feel as the prototype's 0.12 per frame, at any refresh rate
      var dv = Math.abs(goal.az - rig.az) + Math.abs(goal.el - rig.el) + Math.abs(goal.dist - rig.dist) + Math.abs(goal.tz - rig.tz);
      if (dv > 0.02) {
        rig.az += (goal.az - rig.az) * a; rig.el += (goal.el - rig.el) * a;
        rig.dist += (goal.dist - rig.dist) * a; rig.tz += (goal.tz - rig.tz) * a;
        moving = true;
      } else {
        rig.az = goal.az; rig.el = goal.el; rig.dist = goal.dist; rig.tz = goal.tz;
        settled();
      }

      Object.keys(figs).forEach(function (id) {
        var f = figs[id]; if (!f.cur) return;
        if (f.t0 !== undefined) {
          var tt = Math.min(1, (now - f.t0) / f.dur), ee = tt < 0.5 ? 4 * tt * tt * tt : 1 - Math.pow(-2 * tt + 2, 3) / 2;
          f.cur[0] = f.from[0] + (f.goal[0] - f.from[0]) * ee;
          f.cur[1] = f.from[1] + (f.goal[1] - f.from[1]) * ee;
          if (tt < 1) moving = true; else f.t0 = undefined;
        }
        f.g.position.set(f.cur[0], 0, f.cur[1]);
      });

      var k = morphK(), gs = 0.86 + 0.14 * k;
      skin.material.opacity = k; skin.visible = k > 0.01;
      netGroup.visible = k < 0.985;
      overlay.children.forEach(function (o) { if (o.userData.ghost) o.scale.set(gs, gs, 1); });
      Object.keys(figs).forEach(function (id) {
        var f = figs[id];
        var tgt = Math.min(sel && sel !== id ? DIM : 1, f.bench ? 0.5 : 1), dd = tgt - f.dim;
        if (Math.abs(dd) > 0.005) { f.dim += dd * Math.min(1, a * 2.2); moving = true; } else f.dim = tgt;
        f.mats.forEach(function (m) { m.transparent = f.dim < 0.995; m.opacity = f.dim; });
        f.body.scale.y = Math.max(0.001, 1 - k); f.body.visible = k < 0.985;
        f.spr.material.opacity = Math.max(0, 1 - k * 1.6) * f.dim;
        f.disc.visible = k > 0.01; f.disc.material.opacity = k * f.dim;
        f.selRing.visible = sel === id;
      });

      camSet(rig.az, rig.el, rig.dist, rig.tz);
      renderer.render(scene, camera);
      return moving;
    }

    function loop(now) {
      if (dead) { running = false; return; }
      if (draw(now)) requestAnimationFrame(loop); else running = false;
    }

    // ---- Lifecycle ----
    on('webglcontextlost', function (e) {
      e.preventDefault();
      dead = true; running = false;
      settled();
      if (opts.onContextLost) opts.onContextLost();
    });
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(stage);

    function dispose() {
      dead = true; running = false;
      listeners.forEach(function (l) { canvas.removeEventListener(l[0], l[1], l[2]); });
      if (ro) ro.disconnect();
      clearOverlay();
      scene.traverse(function (n) {
        if (n.geometry) n.geometry.dispose();
        if (n.material) { if (n.material.map) n.material.map.dispose(); n.material.dispose(); }
      });
      renderer.dispose();
    }

    function project(x, z) {
      tmp.set(x, 0, z).project(camera);
      return [(tmp.x + 1) / 2 * stage.clientWidth, (1 - tmp.y) / 2 * stage.clientHeight];
    }

    resize();
    rig.dist = goal.dist; rig.tz = goal.tz;

    return { setPlayers: setPlayers, setScene: setScene, setView: setView, resize: resize, dispose: dispose, project: project };
  }

  window.VRSCourt3D = { create: create };
})();
