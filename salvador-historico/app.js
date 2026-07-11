/* Salvador Histórico — app principal */
(function () {
  "use strict";

  var SITES = window.SITES || [];
  var RAIO_DESCOBERTA = 80; // metros

  var CATS = {
    igreja: { rotulo: "Igreja", plural: "Igrejas", cor: "#D99A28" },
    forte: { rotulo: "Forte", plural: "Fortes", cor: "#BE5B34" },
    casa: { rotulo: "Casa & museu", plural: "Casas & museus", cor: "#2B62B8" },
    marco: { rotulo: "Largo & marco", plural: "Largos & marcos", cor: "#3F7D53" }
  };

  /* ---------- estado ---------- */

  var descobertas = carregar("sh:descobertas", []);
  var setDescobertas = new Set(descobertas);
  var filtroAtual = "todos";
  var ordenacao = "tempo"; // "tempo" (cronológica) | "dist" (perto de mim)
  var rumo = 0; // direção da bússola do aparelho, em graus (0 = norte)
  var siteAberto = null;
  var userPos = null;
  var watchId = null;
  var primeiraPosicao = true;

  function carregar(chave, padrao) {
    try {
      var raw = localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : padrao;
    } catch (e) {
      return padrao;
    }
  }

  function salvar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (e) { /* modo privado: segue sem persistir */ }
  }

  /* ---------- utilidades ---------- */

  function $(id) { return document.getElementById(id); }

  function haversine(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function distanciaAte(site) {
    if (!userPos) return null;
    return haversine(userPos.lat, userPos.lng, site.lat, site.lng);
  }

  function fmtDist(m) {
    if (m == null) return "";
    if (m < 1000) return Math.max(10, Math.round(m / 10) * 10) + " m";
    return (m / 1000).toFixed(1).replace(".", ",") + " km";
  }

  function siteDe(id) {
    for (var i = 0; i < SITES.length; i++) if (SITES[i].id === id) return SITES[i];
    return null;
  }

  /* ---------- toast ---------- */

  var toastEl = $("toast");
  var toastTimer = null;

  function toast(msg, dourado) {
    toastEl.textContent = msg;
    toastEl.classList.toggle("dourado", !!dourado);
    toastEl.classList.add("mostrar");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("mostrar");
    }, 3400);
  }

  /* ---------- mapa ---------- */

  var map = L.map("map", {
    zoomControl: false,
    minZoom: 11,
    maxZoom: 19
  }).setView([-12.9724, -38.5095], 15);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> &copy; <a href='https://carto.com/'>CARTO</a>",
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(map);

  map.on("click", fecharSheet);

  /* ---------- marcadores ---------- */

  var marcadores = {};

  function iconeDoSite(site) {
    var classes = "tz c-" + site.categoria;
    if (setDescobertas.has(site.id)) classes += " descoberta";
    if (siteAberto && siteAberto.id === site.id) classes += " ativa";
    return L.divIcon({
      className: "tz-wrap",
      html: '<span class="' + classes + '"><i>✓</i></span>',
      iconSize: [27, 27],
      iconAnchor: [13, 13]
    });
  }

  function criarMarcadores() {
    SITES.forEach(function (site) {
      var m = L.marker([site.lat, site.lng], {
        icon: iconeDoSite(site),
        title: site.nome,
        keyboard: false
      });
      m.on("click", function () { abrirSite(site, false); });
      m.addTo(map);
      marcadores[site.id] = m;
    });
  }

  function atualizarMarcador(site) {
    var m = marcadores[site.id];
    if (m) m.setIcon(iconeDoSite(site));
  }

  function aplicarFiltro(cat) {
    filtroAtual = cat;
    SITES.forEach(function (site) {
      var m = marcadores[site.id];
      var visivel = cat === "todos" || site.categoria === cat;
      if (visivel && !map.hasLayer(m)) m.addTo(map);
      if (!visivel && map.hasLayer(m)) map.removeLayer(m);
    });
    document.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-pressed", c.dataset.cat === cat ? "true" : "false");
    });
    if (siteAberto && cat !== "todos" && siteAberto.categoria !== cat) fecharSheet();
    renderLista();
  }

  /* ---------- voo até o ponto ---------- */

  function voarAte(site) {
    var z = 17;
    var p = map.project([site.lat, site.lng], z).add([0, 140]);
    map.flyTo(map.unproject(p, z), z, { duration: 0.8 });
  }

  /* ---------- bottom sheet ---------- */

  var sheet = $("sheet");
  var sheetBody = $("sheetBody");

  function abrirSite(site, voar) {
    var anterior = siteAberto;
    siteAberto = site;
    if (anterior) atualizarMarcador(anterior);
    atualizarMarcador(site);

    var cat = CATS[site.categoria];
    var d = distanciaAte(site);
    var descoberto = setDescobertas.has(site.id);

    var meta = site.anoLabel;
    if (d != null) meta += " · a " + fmtDist(d) + " de você";
    if (descoberto) meta += ' · <span class="descoberta-tag">✓ descoberta</span>';

    var rota = "https://www.google.com/maps/dir/?api=1&destination=" +
      site.lat + "%2C" + site.lng + "&travelmode=walking";

    var fotoHtml = "";
    if (site.foto) {
      fotoHtml =
        '<figure class="foto-antiga">' +
          '<span class="quadro"><img src="' + site.foto + '" alt="Fotografia de ' + site.nome + '" loading="lazy" decoding="async"></span>' +
          "<figcaption>Foto: " +
            '<a href="' + site.fotoPagina + '" target="_blank" rel="noopener">Wikimedia Commons</a>' +
          "</figcaption>" +
        "</figure>" +
        '<button class="btn-viver" id="btnViver">Mergulhar no passado</button>';
    }

    var fontesHtml = "";
    if (site.fontes && site.fontes.length) {
      fontesHtml = '<section class="fontes"><h3>Fontes</h3><ul>';
      site.fontes.forEach(function (f) {
        fontesHtml += '<li><a href="' + f.u + '" target="_blank" rel="noopener">' + f.t + "</a></li>";
      });
      fontesHtml += "</ul></section>";
    }

    sheetBody.innerHTML =
      '<p class="eyebrow" style="color:' + cat.cor + '">' +
        '<span class="ponto" style="background:' + cat.cor + '"></span>' +
        cat.rotulo + " · " + site.seculo +
      "</p>" +
      '<h2 class="s-title">' + site.nome + "</h2>" +
      '<p class="s-meta" id="sheetMeta">' + meta + "</p>" +
      fotoHtml +
      "<section><h3>Outrora</h3>" +
        '<p class="outrora-texto">' + site.outrora + "</p></section>" +
      "<section><h3>Hoje</h3><p>" + site.hoje + "</p></section>" +
      '<aside class="sabia"><h4>Você sabia?</h4><p>' + site.curiosidade + "</p></aside>" +
      fontesHtml +
      '<div class="s-actions">' +
        '<button class="btn btn-primario' + (descoberto ? " feito" : "") + '" id="btnDescobrir">' +
          (descoberto ? "Descoberta ✓" : "Marcar descoberta") + "</button>" +
        '<a class="btn btn-contorno" href="' + rota + '" target="_blank" rel="noopener">Rota a pé</a>' +
      "</div>";

    var fotoImg = sheetBody.querySelector(".foto-antiga img");
    if (fotoImg) {
      fotoImg.addEventListener("error", function () {
        var fig = sheetBody.querySelector(".foto-antiga");
        if (fig) fig.style.display = "none";
        var bv = $("btnViver");
        if (bv) bv.style.display = "none";
      });
      fotoImg.parentNode.addEventListener("click", function () { viverAbrir(site); });
    }
    var btnViver = $("btnViver");
    if (btnViver) {
      btnViver.addEventListener("click", function () { viverAbrir(site); });
    }

    $("btnDescobrir").addEventListener("click", function () {
      if (!setDescobertas.has(site.id)) descobrir(site, false);
    });

    sheet.classList.add("aberta");
    sheetBody.scrollTop = 0;
    if (voar) voarAte(site);
  }

  function fecharSheet() {
    if (!siteAberto) return;
    var s = siteAberto;
    siteAberto = null;
    atualizarMarcador(s);
    sheet.classList.remove("aberta");
  }

  /* arrastar para fechar */
  (function () {
    var grip = $("sheetGrip");
    var y0 = null;
    var largo = function () { return window.innerWidth >= 720; };

    function transformar(dy) {
      sheet.style.transform = largo()
        ? "translate(-50%," + dy + "px)"
        : "translateY(" + dy + "px)";
    }

    grip.addEventListener("pointerdown", function (e) {
      y0 = e.clientY;
      sheet.classList.add("arrastando");
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener("pointermove", function (e) {
      if (y0 == null) return;
      var dy = Math.max(0, e.clientY - y0);
      transformar(dy);
    });
    grip.addEventListener("pointerup", function (e) {
      if (y0 == null) return;
      var dy = e.clientY - y0;
      y0 = null;
      sheet.classList.remove("arrastando");
      sheet.style.transform = "";
      if (dy > 90) fecharSheet();
    });
    grip.addEventListener("pointercancel", function () {
      y0 = null;
      sheet.classList.remove("arrastando");
      sheet.style.transform = "";
    });
  })();

  $("sheetClose").addEventListener("click", fecharSheet);

  /* ---------- descobertas ---------- */

  function descobrir(site, automatico) {
    setDescobertas.add(site.id);
    salvar("sh:descobertas", Array.from(setDescobertas));
    atualizarMarcador(site);
    atualizarPlacar();
    renderLista();
    if (navigator.vibrate) { try { navigator.vibrate(automatico ? [40, 80, 40] : 40); } catch (e) {} }

    if (automatico) {
      $("carimboNome").textContent = site.nome;
      $("carimboNum").textContent = setDescobertas.size + " de " + SITES.length + " lugares";
      var carimbo = $("carimbo");
      carimbo.classList.remove("bate");
      void carimbo.offsetWidth;
      carimbo.classList.add("bate");
      if (!siteAberto) abrirSite(site, true);
    }
    if (siteAberto && siteAberto.id === site.id) abrirSite(site, false);
    atualizarRadar();
  }

  function atualizarPlacar() {
    $("placarTopo").textContent = setDescobertas.size + "/" + SITES.length;
    $("placarPainel").textContent =
      setDescobertas.size + " de " + SITES.length + " lugares descobertos";
    var fitas = $("fitas").children;
    for (var i = 0; i < fitas.length; i++) {
      fitas[i].classList.toggle("on", i < setDescobertas.size);
    }
  }

  function checarProximidade() {
    if (!userPos) return;
    SITES.forEach(function (site) {
      if (setDescobertas.has(site.id)) return;
      var d = distanciaAte(site);
      if (d != null && d <= RAIO_DESCOBERTA) descobrir(site, true);
    });
  }

  /* ---------- GPS ---------- */

  var meMarker = null;
  var meCirculo = null;
  var fabLocate = $("fabLocate");

  function atualizarPosicao(pos) {
    userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    var acc = pos.coords.accuracy || 0;

    if (!meMarker) {
      meMarker = L.marker([userPos.lat, userPos.lng], {
        icon: L.divIcon({ className: "me-dot", html: "<span></span>", iconSize: [16, 16], iconAnchor: [8, 8] }),
        interactive: false,
        zIndexOffset: 1000
      }).addTo(map);
      meCirculo = L.circle([userPos.lat, userPos.lng], {
        radius: acc, color: "#2B62B8", weight: 1, opacity: 0.35,
        fillColor: "#2B62B8", fillOpacity: 0.08, interactive: false
      }).addTo(map);
    } else {
      meMarker.setLatLng([userPos.lat, userPos.lng]);
      meCirculo.setLatLng([userPos.lat, userPos.lng]).setRadius(acc);
    }

    fabLocate.classList.remove("buscando");
    fabLocate.setAttribute("aria-pressed", "true");

    if (primeiraPosicao) {
      primeiraPosicao = false;
      map.flyTo([userPos.lat, userPos.lng], Math.max(map.getZoom(), 16), { duration: 1 });
    }

    checarProximidade();
    atualizarDistanciasLista();
    atualizarRadar();

    if (siteAberto) {
      var metaEl = $("sheetMeta");
      if (metaEl) {
        var d = distanciaAte(siteAberto);
        var texto = siteAberto.anoLabel + " · a " + fmtDist(d) + " de você";
        if (setDescobertas.has(siteAberto.id)) {
          texto += ' · <span class="descoberta-tag">✓ descoberta</span>';
        }
        metaEl.innerHTML = texto;
      }
    }
  }

  function erroPosicao(err) {
    fabLocate.classList.remove("buscando");
    fabLocate.setAttribute("aria-pressed", "false");
    watchId = null;
    if (err && err.code === 1) {
      toast("Acesso à localização negado. Você ainda pode explorar o mapa e tocar nos pontos.");
    } else {
      toast("Não foi possível obter sua localização agora. Tente de novo em instantes.");
    }
  }

  function ligarGPS() {
    if (!("geolocation" in navigator)) {
      toast("Seu navegador não oferece localização. Explore o mapa livremente.");
      return;
    }
    if (watchId != null) return;
    primeiraPosicao = true;
    fabLocate.classList.add("buscando");
    watchId = navigator.geolocation.watchPosition(atualizarPosicao, erroPosicao, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000
    });
  }

  function desligarGPS() {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    fabLocate.classList.remove("buscando");
    fabLocate.setAttribute("aria-pressed", "false");
  }

  fabLocate.addEventListener("click", function () {
    if (watchId != null) {
      if (userPos) {
        map.flyTo([userPos.lat, userPos.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
      } else {
        desligarGPS();
      }
    } else {
      ligarGPS();
    }
  });

  /* ---------- radar do explorador ---------- */

  var radarEl = $("radar");
  var radarSeta = $("radarSeta");
  var alvoRadar = null;

  function rumoAte(lat1, lng1, lat2, lng2) {
    var f1 = lat1 * Math.PI / 180;
    var f2 = lat2 * Math.PI / 180;
    var dl = (lng2 - lng1) * Math.PI / 180;
    var y = Math.sin(dl) * Math.cos(f2);
    var x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function girarSeta() {
    if (!alvoRadar || !userPos) return;
    var b = rumoAte(userPos.lat, userPos.lng, alvoRadar.lat, alvoRadar.lng);
    radarSeta.style.transform = "rotate(" + Math.round(b - rumo) + "deg)";
  }

  function atualizarRadar() {
    if (!userPos) { radarEl.hidden = true; return; }

    var melhor = null;
    var melhorD = Infinity;
    SITES.forEach(function (s) {
      if (setDescobertas.has(s.id)) return;
      var d = distanciaAte(s);
      if (d < melhorD) { melhorD = d; melhor = s; }
    });

    radarEl.hidden = false;

    if (!melhor) {
      alvoRadar = null;
      $("radarNome").textContent = "Tudo descoberto!";
      $("radarDist").textContent = SITES.length + " de " + SITES.length + " lugares";
      radarSeta.style.visibility = "hidden";
      return;
    }

    alvoRadar = melhor;
    radarSeta.style.visibility = "";
    $("radarNome").textContent = melhor.nome;
    $("radarDist").textContent = "a " + fmtDist(melhorD) + " · siga a seta";
    girarSeta();
  }

  radarEl.addEventListener("click", function () {
    if (alvoRadar) abrirSite(alvoRadar, true);
  });

  window.addEventListener("deviceorientation", function (e) {
    var h = null;
    if (typeof e.webkitCompassHeading === "number") h = e.webkitCompassHeading;
    else if (e.absolute && typeof e.alpha === "number") h = 360 - e.alpha;
    if (h != null) { rumo = h; girarSeta(); }
  });

  /* ---------- som do passado (WebAudio: mar, vento e sinos) ---------- */

  var som = {
    ctx: null, master: null, ruidoGain: null, timer: null,
    ativo: false,
    ligado: carregar("sh:som", true)
  };

  function criarAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    som.ctx = new AC();

    som.master = som.ctx.createGain();
    som.master.gain.value = 0;
    var teto = som.ctx.createBiquadFilter();
    teto.type = "lowpass";
    teto.frequency.value = 720;
    som.master.connect(teto);
    teto.connect(som.ctx.destination);

    // mar/vento: ruído marrom em loop, bem grave e baixo
    var sr = som.ctx.sampleRate;
    var buf = som.ctx.createBuffer(1, sr * 3, sr);
    var d = buf.getChannelData(0);
    var ultimo = 0;
    for (var i = 0; i < d.length; i++) {
      var branco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * branco) / 1.02;
      d[i] = ultimo * 3.2;
    }
    var fonte = som.ctx.createBufferSource();
    fonte.buffer = buf;
    fonte.loop = true;
    var grave = som.ctx.createBiquadFilter();
    grave.type = "lowpass";
    grave.frequency.value = 340;
    som.ruidoGain = som.ctx.createGain();
    som.ruidoGain.gain.value = 0.05;
    fonte.connect(grave);
    grave.connect(som.ruidoGain);
    som.ruidoGain.connect(som.master);
    fonte.start();

    // ondulação lenta do mar
    var lfo = som.ctx.createOscillator();
    lfo.frequency.value = 0.06;
    var lfoGain = som.ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(som.ruidoGain.gain);
    lfo.start();

    return true;
  }

  function sinoToca() {
    if (!som.ctx || !som.ativo) return;
    var t = som.ctx.currentTime;
    [[155.56, 0.05], [311.13, 0.02], [415.3, 0.012]].forEach(function (p) {
      var o = som.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = p[0];
      var g = som.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(p[1], t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
      o.connect(g);
      g.connect(som.master);
      o.start(t);
      o.stop(t + 7.2);
    });
  }

  function agendarSino() {
    clearTimeout(som.timer);
    som.timer = setTimeout(function () {
      sinoToca();
      agendarSino();
    }, 11000 + Math.random() * 17000);
  }

  function somLigar() {
    if (!som.ligado) return;
    if (!som.ctx && !criarAudio()) return;
    if (som.ctx.state === "suspended") som.ctx.resume();
    som.ativo = true;
    var t = som.ctx.currentTime;
    som.master.gain.cancelScheduledValues(t);
    som.master.gain.setValueAtTime(som.master.gain.value, t);
    som.master.gain.linearRampToValueAtTime(1, t + 2.2);
    agendarSino();
  }

  function somParar() {
    if (!som.ctx || !som.ativo) return;
    som.ativo = false;
    clearTimeout(som.timer);
    var t = som.ctx.currentTime;
    som.master.gain.cancelScheduledValues(t);
    som.master.gain.setValueAtTime(som.master.gain.value, t);
    som.master.gain.linearRampToValueAtTime(0, t + 0.6);
  }

  var fabSom = $("fabSom");

  function pintarSom() {
    fabSom.setAttribute("aria-pressed", som.ligado ? "true" : "false");
    fabSom.classList.toggle("mudo", !som.ligado);
  }

  fabSom.addEventListener("click", function () {
    som.ligado = !som.ligado;
    salvar("sh:som", som.ligado);
    pintarSom();
    var deveria = document.body.classList.contains("past") || document.body.classList.contains("imerso");
    if (som.ligado && deveria) somLigar();
    else somParar();
  });
  pintarSom();

  document.addEventListener("visibilitychange", function () {
    if (!som.ctx) return;
    if (document.hidden) {
      if (som.ativo) som.ctx.suspend();
    } else if (som.ativo) {
      som.ctx.resume();
    }
  });

  /* ---------- modo Outrora ---------- */

  var fabPast = $("fabPast");
  fabPast.addEventListener("click", function () {
    var ativo = document.body.classList.toggle("past");
    fabPast.setAttribute("aria-pressed", ativo ? "true" : "false");

    var flash = $("flash");
    flash.classList.remove("on");
    void flash.offsetWidth;
    flash.classList.add("on");

    if (ativo) somLigar();
    else if (!document.body.classList.contains("imerso")) somParar();
  });

  /* ---------- modo cinema: mergulhar no passado ---------- */

  var viver = $("viver");

  function viverAbrir(site) {
    var img = $("viverImg");
    img.src = site.foto || "";
    img.alt = "Fotografia de " + site.nome;
    $("viverAno").textContent = /^\d+$/.test(site.ano) ? site.ano : site.seculo;
    $("viverNome").textContent = site.nome;
    $("viverTexto").textContent = site.outrora;
    $("viverSabia").textContent = site.curiosidade;
    $("viverConteudo").scrollTop = 0;
    viver.classList.add("aberto");
    document.body.classList.add("imerso");
    somLigar();
  }

  function viverFechar() {
    viver.classList.remove("aberto");
    document.body.classList.remove("imerso");
    if (!document.body.classList.contains("past")) somParar();
  }

  $("viverFechar").addEventListener("click", viverFechar);

  /* ---------- painel Explorar ---------- */

  var painel = $("painel");
  var listaEl = $("painelLista");

  $("fabLista").addEventListener("click", function () {
    renderLista();
    painel.classList.add("aberto");
  });
  $("painelFechar").addEventListener("click", function () {
    painel.classList.remove("aberto");
  });
  $("gpsDica").addEventListener("click", function () {
    painel.classList.remove("aberto");
    ligarGPS();
  });

  var ERAS = {
    XVI: "A capital nasce — muralhas, fé e o primeiro governo do Brasil",
    XVII: "Guerras holandesas e a riqueza do açúcar",
    XVIII: "O apogeu do barroco e da fé popular",
    XIX: "Máquinas, medicina e o Império",
    XX: "Memória, cultura e a cidade viva"
  };

  function seculoRomano(ano) {
    var romanos = ["XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
    var n = Math.floor((ano - 1) / 100) + 1;
    return romanos[n - 16] || String(n);
  }

  // A Wikimedia só gera thumbs em larguras fixas (330px e 960px respondem 200;
  // 320/480/640/800 retornam 400) — por isso 330px, não outro valor.
  function fotoMini(u) {
    return u && u.indexOf("/960px-") > -1 ? u.replace("/960px-", "/330px-") : u;
  }

  function itemHtml(site) {
    var cat = CATS[site.categoria];
    var d = distanciaAte(site);
    var descoberto = setDescobertas.has(site.id);

    return '<button class="item' + (descoberto ? " descoberto" : "") + '" data-id="' + site.id + '">' +
      '<span class="tile" style="background:' + cat.cor + '"><i>✓</i></span>' +
      '<span class="info">' +
        '<span class="nome">' + site.nome + "</span>" +
        '<span class="sub">' + cat.rotulo + " · " + site.seculo + "</span>" +
      "</span>" +
      (d != null ? '<span class="dist">' + fmtDist(d) + "</span>" : "") +
    "</button>";
  }

  function tlItemHtml(site) {
    var cat = CATS[site.categoria];
    var d = distanciaAte(site);
    var descoberto = setDescobertas.has(site.id);
    var ano = /^\d+$/.test(site.ano) ? site.ano : "c. " + site.anoNum;

    return '<button class="titem' + (descoberto ? " descoberto" : "") + '" data-id="' + site.id + '">' +
      '<span class="titem-no" style="background:' + cat.cor + '"><i>' + (descoberto ? "✓" : "") + "</i></span>" +
      '<span class="titem-corpo">' +
        '<span class="titem-ano">' + ano + "</span>" +
        '<span class="nome">' + site.nome + "</span>" +
        '<span class="sub">' + cat.rotulo + (d != null ? " · a " + fmtDist(d) : "") + "</span>" +
      "</span>" +
      (site.foto ? '<img class="titem-foto" src="' + fotoMini(site.foto) + '" alt="" loading="lazy">' : "") +
    "</button>";
  }

  function renderLista() {
    var itens = SITES.filter(function (s) {
      return filtroAtual === "todos" || s.categoria === filtroAtual;
    });

    var html = "";

    if (ordenacao === "tempo") {
      itens = itens.slice().sort(function (a, b) {
        return a.anoNum - b.anoNum || a.nome.localeCompare(b.nome);
      });
      var seculoAtual = null;
      itens.forEach(function (site) {
        var sec = seculoRomano(site.anoNum);
        if (sec !== seculoAtual) {
          seculoAtual = sec;
          html += '<div class="epoca">' +
            '<span class="epoca-sec">Século ' + sec + "</span>" +
            (ERAS[sec] ? '<span class="epoca-sub">' + ERAS[sec] + "</span>" : "") +
          "</div>";
        }
        html += tlItemHtml(site);
      });
    } else {
      if (userPos) {
        itens = itens.slice().sort(function (a, b) {
          return distanciaAte(a) - distanciaAte(b);
        });
      }
      itens.forEach(function (site) { html += itemHtml(site); });
    }

    listaEl.innerHTML = html;

    listaEl.querySelectorAll(".titem-foto").forEach(function (img) {
      img.addEventListener("error", function () { img.style.display = "none"; });
    });

    if (
      ordenacao === "tempo" &&
      "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      var io = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("vis");
            io.unobserve(en.target);
          }
        });
      }, { root: listaEl, rootMargin: "0px 0px -8% 0px" });

      listaEl.querySelectorAll(".titem").forEach(function (el) {
        el.classList.add("prep");
        io.observe(el);
      });
    }

    $("gpsDica").classList.toggle("oculta", userPos != null);
  }

  // Atualização leve a cada tick do GPS: troca só os textos de distância.
  // Recriar a lista inteira (innerHTML) a cada posição destruía as <img>
  // no meio do carregamento — as fotos da timeline nunca terminavam de baixar.
  function atualizarDistanciasLista() {
    if (!painel.classList.contains("aberto")) return;
    var precisaRender = false;

    listaEl.querySelectorAll("[data-id]").forEach(function (el) {
      var site = siteDe(el.getAttribute("data-id"));
      if (!site) return;
      var d = distanciaAte(site);
      if (d == null) return;
      var cat = CATS[site.categoria];

      if (el.classList.contains("titem")) {
        var sub = el.querySelector(".sub");
        if (sub) sub.textContent = cat.rotulo + " · a " + fmtDist(d);
      } else {
        var dist = el.querySelector(".dist");
        if (dist) dist.textContent = fmtDist(d);
        else precisaRender = true; // lista foi montada sem GPS: monta de novo uma vez
      }
    });

    if (precisaRender) renderLista();
  }

  function setOrdenacao(o) {
    ordenacao = o;
    $("ordTempo").setAttribute("aria-pressed", o === "tempo" ? "true" : "false");
    $("ordDist").setAttribute("aria-pressed", o === "dist" ? "true" : "false");
    renderLista();
  }

  $("ordTempo").addEventListener("click", function () { setOrdenacao("tempo"); });
  $("ordDist").addEventListener("click", function () { setOrdenacao("dist"); });

  listaEl.addEventListener("click", function (e) {
    var alvo = e.target.closest(".item, .titem");
    if (!alvo) return;
    var site = siteDe(alvo.dataset.id);
    if (!site) return;
    painel.classList.remove("aberto");
    abrirSite(site, true);
  });

  /* ---------- filtros ---------- */

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      aplicarFiltro(chip.dataset.cat);
    });
  });

  /* ---------- introdução ---------- */

  var intro = $("intro");

  function fecharIntro() {
    salvar("sh:intro", true);
    intro.classList.add("saindo");
    setTimeout(function () { intro.classList.add("oculta"); }, 400);
  }

  $("introGps").addEventListener("click", function () {
    fecharIntro();
    ligarGPS();
  });
  $("introExplorar").addEventListener("click", fecharIntro);

  if (carregar("sh:intro", false)) {
    intro.classList.add("oculta");
  }

  /* ---------- teclado (desktop) ---------- */

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (viver.classList.contains("aberto")) viverFechar();
      else if (painel.classList.contains("aberto")) painel.classList.remove("aberto");
      else fecharSheet();
    }
  });

  /* ---------- boot ---------- */

  criarMarcadores();

  var fitasEl = $("fitas");
  var fitasHtml = "";
  for (var i = 0; i < SITES.length; i++) {
    fitasHtml += '<span class="f' + ((i % 6) + 1) + '"></span>';
  }
  fitasEl.innerHTML = fitasHtml;

  atualizarPlacar();
  renderLista();
})();
