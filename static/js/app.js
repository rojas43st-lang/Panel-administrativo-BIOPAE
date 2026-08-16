/* ============================================================
   BioPAE — Panel Administrativo (SIMULACIÓN)
   ------------------------------------------------------------
   Este archivo NO usa base de datos real. Estudiantes, entregas,
   asistencia, casos y estadísticas son datos generados en memoria
   (ver generarDatosSimulados) para validar el diseño del panel de
   extremo a extremo. Cuando haya backend real, esta capa de datos
   se reemplaza por llamadas a la API/base de datos, manteniendo la
   misma forma de los objetos:

   Estudiante: { id, qrId, nombre, grado, grupo, programa, estado }
   Entrega:    { id, estudianteId, fecha, programa, tipo, registradoPor }
   Falta:      { fecha, programa, estudianteId }
   Caso:       { id, estudianteId, motivo, fechaApertura, noReclamos, estado, decision }
   ============================================================ */

const COLORS = {
  primary: "#1F5D50",
  primaryDark: "#14403A",
  accent: "#E3A008",
  danger: "#B3401F",
  success: "#2F7A4F",
  border: "#E1E4DB",
  muted: "#5B6B67",
};

// El Estado entrega estas cantidades FIJAS todos los días.
// Cada estudiante beneficiario pertenece a un único programa.
const CAPACIDAD = {
  vaso_leche: 200,
  almuerzo: 100,
};

const PROGRAMA_LABEL = {
  vaso_leche: "Vaso de leche",
  almuerzo: "Almuerzo",
};

const REGISTRADO_POR = "aux. Carlos Calvito";

const GRADOS = [6, 7, 8, 9, 10, 11];
const SUBGRUPOS = [1, 2, 3, 4, 5, 6];
const GRUPOS = GRADOS.flatMap((g) => SUBGRUPOS.map((s) => `${g}°${s}`));

const NOMBRES_PILA = [
  "Mariana", "Samuel", "Isabella", "Juan Pablo", "Valentina", "Santiago", "Salomé", "Emmanuel",
  "Luciana", "Tomás", "Antonella", "Jerónimo", "Gabriela", "Simón", "Sara", "Mateo", "Emily",
  "David", "Sofía", "Nicolás", "Camila", "Julián", "Manuela", "Andrés", "Esteban", "Renata",
  "Miguel Ángel", "Paulina", "Kevin", "Laura Valentina", "Sebastián", "Dulce María", "Alejandro",
  "Martina", "Cristian", "Ximena", "Brayan", "Yulieth", "Óscar", "Danna Sofía", "Felipe", "Ashley",
  "Ronaldo", "Melissa", "Johan", "Katherine", "Deiber", "Natalia", "Yeison", "Luisa Fernanda",
];
const APELLIDOS = [
  "Gómez", "Restrepo", "Ríos", "Vélez", "Ospina", "Ceballos", "Duque", "Zapata", "Hoyos",
  "Betancur", "Correa", "Arango", "Marín", "Uribe", "Londoño", "Cardona", "Palacio", "Montoya",
  "Giraldo", "Álvarez", "Ramírez", "Pérez", "Serna", "Muñoz", "Vargas", "Franco", "Suárez",
  "Toro", "Escobar", "Osorio", "Roldán", "Puerta", "Quintero", "Bedoya", "Zuluaga", "Loaiza",
  "Higuita", "Salazar", "Castaño", "Grajales", "Mesa", "Cano", "Tabares", "Isaza", "Gallego",
];

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function ultimosDiasHabiles(n, desde = new Date("2026-08-14")) {
  const dias = [];
  let cursor = new Date(desde);
  while (dias.length < n) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) dias.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dias.reverse();
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function shuffle(rand, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- generación de datos simulados ---------------- */

function generarDatosSimulados() {
  const rand = seededRandom(20260814);

  // 1) Estudiantes: 200 en vaso de leche + 100 en almuerzo = 300 en total,
  //    repartidos entre los 36 grupos (6°1 ... 11°6). Un estudiante SOLO
  //    puede estar en un programa, nunca en los dos.
  const programasAsignados = [
    ...Array(CAPACIDAD.vaso_leche).fill("vaso_leche"),
    ...Array(CAPACIDAD.almuerzo).fill("almuerzo"),
  ];
  const programasBarajados = shuffle(rand, programasAsignados);

  const estudiantes = programasBarajados.map((programa, i) => {
    const grupo = pick(rand, GRUPOS);
    const grado = grupo.split("°")[0] + "°";
    const nombre = `${pick(rand, NOMBRES_PILA)} ${pick(rand, APELLIDOS)} ${pick(rand, APELLIDOS)}`;

    // Estado por defecto: activo. Un pequeño grupo del programa de vaso de
    // leche queda "en_revision" (inasistencias injustificadas al reclamo) y
    // un puñado queda "suspendido" (ya se les retiró el beneficio).
    let estado = "activo";
    if (programa === "vaso_leche" && rand() < 0.045) estado = "en_revision";
    else if (rand() < 0.015) estado = "suspendido";

    return {
      id: i + 1,
      qrId: `PAE-${String(i + 1).padStart(4, "0")}`,
      nombre,
      grado,
      grupo,
      programa,
      estado,
    };
  });

  const dias = ultimosDiasHabiles(14);

  const entregas = [];
  const faltas = [];
  let entregaId = 1;

  dias.forEach((fecha) => {
    ["vaso_leche", "almuerzo"].forEach((programa) => {
      const capacidad = CAPACIDAD[programa];
      // Todos los estudiantes asignados a este programa (la capacidad
      // diaria del Estado coincide exactamente con el número de
      // beneficiarios matriculados en el programa).
      const beneficiarios = estudiantes.filter((e) => e.programa === programa);

      const ausentesHoy = [];
      const reclamanHoy = [];

      beneficiarios.forEach((est) => {
        let probFalta = 0.08; // estudiante activo: ausentismo normal
        if (est.estado === "suspendido") probFalta = 1; // nunca reclama
        else if (est.estado === "en_revision") probFalta = 0.6; // inasistencia reiterada e injustificada

        if (rand() < probFalta) ausentesHoy.push(est);
        else reclamanHoy.push(est);
      });

      // Todo lo que no se reclama SE REDISTRIBUYE (para que no se
      // desperdicie comida), venga o no haya venido el estudiante titular.
      // Por eso el número de "no reclamados" siempre coincide con el
      // número de porciones redistribuidas ese día.
      const deficit = capacidad - reclamanHoy.length; // === ausentesHoy.length

      const candidatosRedistribucion = shuffle(
        rand,
        estudiantes.filter((e) => e.programa !== programa)
      ).slice(0, deficit);

      reclamanHoy.forEach((est) => {
        entregas.push({
          id: entregaId++,
          estudianteId: est.id,
          fecha,
          programa,
          tipo: "beneficiario",
          registradoPor: REGISTRADO_POR,
        });
      });

      candidatosRedistribucion.forEach((est) => {
        entregas.push({
          id: entregaId++,
          estudianteId: est.id,
          fecha,
          programa,
          tipo: "redistribuido",
          registradoPor: REGISTRADO_POR,
        });
      });

      ausentesHoy.forEach((est) => {
        faltas.push({ fecha, programa, estudianteId: est.id });
      });
    });
  });

  // Casos en revisión: estudiantes del programa de vaso de leche marcados
  // "en_revision" por inasistencias injustificadas y reiteradas al reclamo.
  const casos = [];
  let casoId = 1;
  estudiantes.forEach((est) => {
    if (est.estado === "en_revision") {
      const noReclamos = faltas.filter(
        (f) => f.estudianteId === est.id && f.programa === "vaso_leche"
      ).length;
      const yaResuelto = rand() < 0.4;
      casos.push({
        id: casoId++,
        estudianteId: est.id,
        motivo: "Inasistencias injustificadas y reiteradas en el reclamo del vaso de leche",
        fechaApertura: pick(rand, dias),
        noReclamos,
        estado: yaResuelto ? "resuelto" : "pendiente",
        decision: yaResuelto ? (rand() < 0.5 ? "mantener" : "suspender") : null,
      });
    }
  });

  return { estudiantes, entregas, faltas, casos, dias };
}

let DATA = generarDatosSimulados();
let HOY = DATA.dias[DATA.dias.length - 1];

/* ---------------- helpers de dominio ---------------- */

function estudiantePorId(id) {
  return DATA.estudiantes.find((e) => e.id === id);
}

function entregasDe({ fecha, programa, tipo } = {}) {
  return DATA.entregas.filter(
    (e) =>
      (!fecha || e.fecha === fecha) &&
      (!programa || e.programa === programa) &&
      (!tipo || e.tipo === tipo)
  );
}

function faltasDe({ fecha, programa } = {}) {
  return DATA.faltas.filter(
    (f) => (!fecha || f.fecha === fecha) && (!programa || f.programa === programa)
  );
}

function badgePrograma(programa) {
  const cls = programa === "vaso_leche" ? "badge-leche" : "badge-almuerzo";
  const icon = programa === "vaso_leche" ? "🥛" : "🍽️";
  return `<span class="badge ${cls}">${icon} ${PROGRAMA_LABEL[programa]}</span>`;
}

function badgeEstado(estado) {
  const map = {
    activo: ["Activo", "badge-activo"],
    en_revision: ["En revisión", "badge-en_revision"],
    suspendido: ["Suspendido", "badge-suspendido"],
  };
  const [label, cls] = map[estado] || map.activo;
  return `<span class="badge ${cls}">${label}</span>`;
}

function badgeTipo(tipo) {
  return tipo === "beneficiario"
    ? `<span class="badge badge-beneficiario">Beneficiario</span>`
    : `<span class="badge badge-redistribuido">Redistribuido</span>`;
}

function fechaLarga(fechaIso) {
  return new Date(fechaIso + "T00:00:00").toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function el(html) {
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  return div.firstElementChild;
}

/* ==================== ESTADO DE SESIÓN / NAVEGACIÓN ==================== */

let sesion = null; // { rol, usuario }
let paginaActual = "dashboard";
const chartRegistry = {};

function destruirCharts() {
  Object.values(chartRegistry).forEach((c) => c && c.destroy());
  Object.keys(chartRegistry).forEach((k) => delete chartRegistry[k]);
}

/* ==================== LOGIN ==================== */

function initLogin() {
  let rolSeleccionado = null;
  const options = document.querySelectorAll(".rol-option");
  const btnLogin = document.getElementById("btn-login");

  options.forEach((btn) => {
    btn.addEventListener("click", () => {
      rolSeleccionado = btn.dataset.rol;
      options.forEach((b) => b.classList.toggle("active", b === btn));
      btnLogin.disabled = false;
    });
  });

  btnLogin.addEventListener("click", () => {
    if (!rolSeleccionado) return;
    const usuarioInput = document.getElementById("login-usuario").value.trim();
    const usuario =
      usuarioInput ||
      (rolSeleccionado === "coordinador" ? "coord. Diana Ossa" : "rectora@javierailondono.edu.co");
    sesion = { rol: rolSeleccionado, usuario };
    mostrarApp();
  });
}

function mostrarApp() {
  document.getElementById("view-login").classList.add("hidden");
  document.getElementById("view-app").classList.remove("hidden");

  const rolLabel = { coordinador: "Coordinador PAE", rectora: "Rectora" }[sesion.rol];
  document.getElementById("sidebar-rol").textContent = rolLabel;
  document.getElementById("sidebar-usuario").textContent = sesion.usuario;
  document.getElementById("topbar-fecha").textContent = fechaLarga(HOY);

  irAPagina("dashboard");
}

function cerrarSesion() {
  sesion = null;
  destruirCharts();
  document.getElementById("view-app").classList.add("hidden");
  document.getElementById("view-login").classList.remove("hidden");
  document.querySelectorAll(".rol-option").forEach((b) => b.classList.remove("active"));
  document.getElementById("btn-login").disabled = true;
  document.getElementById("login-usuario").value = "";
  document.getElementById("login-clave").value = "";
}

function irAPagina(pagina) {
  paginaActual = pagina;
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === pagina));
  destruirCharts();
  const soloLectura = sesion.rol === "rectora";
  const contenedor = document.getElementById("page-content");

  const renderers = {
    dashboard: renderDashboard,
    estudiantes: () => renderEstudiantes(soloLectura),
    historial: renderHistorial,
    control: renderControlDiario,
    casos: () => renderCasos(soloLectura),
    reportes: renderReportes,
  };
  contenedor.innerHTML = "";
  contenedor.appendChild(renderers[pagina]());
}

/* ==================== DASHBOARD ==================== */

function renderDashboard() {
  const lecheHoy = entregasDe({ fecha: HOY, programa: "vaso_leche" });
  const almuerzoHoy = entregasDe({ fecha: HOY, programa: "almuerzo" });
  const redisLecheHoy = lecheHoy.filter((e) => e.tipo === "redistribuido").length;
  const redisAlmuerzoHoy = almuerzoHoy.filter((e) => e.tipo === "redistribuido").length;
  const faltasHoy = faltasDe({ fecha: HOY }).length;

  const wrap = el(`<div>
    <div class="page-header">
      <h1>Panel general</h1>
      <p>Estado de hoy y tendencia de los últimos 14 días hábiles.</p>
    </div>

    <div class="info-banner">
      El Estado entrega diariamente <b>${CAPACIDAD.vaso_leche} vasos de leche</b> y
      <b>${CAPACIDAD.almuerzo} almuerzos</b>. Ninguna porción se desperdicia: lo que un
      beneficiario no reclama se redistribuye ese mismo día entre otros estudiantes.
    </div>

    <div class="grid grid-4">
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:var(--primary-soft);color:var(--primary)">🥛</div>
        <div>
          <div class="kpi-value">${lecheHoy.length}/${CAPACIDAD.vaso_leche}</div>
          <div class="kpi-label">Vasos de leche entregados hoy</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:var(--accent-soft);color:var(--accent-text)">🍽️</div>
        <div>
          <div class="kpi-value">${almuerzoHoy.length}/${CAPACIDAD.almuerzo}</div>
          <div class="kpi-label">Almuerzos entregados hoy</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:var(--accent-soft);color:var(--accent)">🔁</div>
        <div>
          <div class="kpi-value">${redisLecheHoy + redisAlmuerzoHoy}</div>
          <div class="kpi-label">Porciones redistribuidas hoy</div>
          <div class="kpi-sub" style="color:var(--accent-text)">${redisLecheHoy} leche · ${redisAlmuerzoHoy} almuerzo</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:var(--danger-soft);color:var(--danger)">🚫</div>
        <div>
          <div class="kpi-value">${faltasHoy}</div>
          <div class="kpi-label">Estudiantes que faltaron hoy</div>
        </div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <h3>Entregas por día (últimos 14 días hábiles)</h3>
        <div class="chart-box"><canvas id="chart-serie-diaria"></canvas></div>
      </div>
      <div class="card">
        <h3>Beneficiarios por grado y programa</h3>
        <div class="chart-box"><canvas id="chart-por-grado"></canvas></div>
      </div>
    </div>

    <div class="grid grid-3" style="margin-top:16px">
      <div class="card">
        <h3>Tipo de entrega (14 días)</h3>
        <div class="chart-box-sm"><canvas id="chart-tipo-entrega"></canvas></div>
      </div>
      <div class="card" style="grid-column: span 2;">
        <h3>Resumen de matrícula del programa</h3>
        <div class="grid grid-3">
          <div class="card" style="background:var(--surface-alt);border:none;text-align:center">
            <div class="kpi-value">${DATA.estudiantes.length}</div>
            <div class="kpi-label">Total estudiantes en PAE</div>
          </div>
          <div class="card" style="background:var(--surface-alt);border:none;text-align:center">
            <div class="kpi-value" style="color:var(--primary)">${DATA.estudiantes.filter((e) => e.programa === "vaso_leche").length}</div>
            <div class="kpi-label">En vaso de leche</div>
          </div>
          <div class="card" style="background:var(--surface-alt);border:none;text-align:center">
            <div class="kpi-value" style="color:var(--accent-text)">${DATA.estudiantes.filter((e) => e.programa === "almuerzo").length}</div>
            <div class="kpi-label">En almuerzo</div>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:12px">
          Cada estudiante pertenece a un único programa (vaso de leche <b>o</b> almuerzo, nunca los dos) —
          la asignación se controla en la sección Estudiantes.
        </p>
      </div>
    </div>
  </div>`);

  // Se agenda el pintado de charts tras insertar en el DOM
  requestAnimationFrame(() => {
    const serieDiaria = DATA.dias.map((f) => ({
      fecha: f.slice(5),
      leche: entregasDe({ fecha: f, programa: "vaso_leche" }).length,
      almuerzo: entregasDe({ fecha: f, programa: "almuerzo" }).length,
    }));
    chartRegistry.serieDiaria = new Chart(document.getElementById("chart-serie-diaria"), {
      type: "line",
      data: {
        labels: serieDiaria.map((d) => d.fecha),
        datasets: [
          { label: "Vaso de leche", data: serieDiaria.map((d) => d.leche), borderColor: COLORS.primary, backgroundColor: COLORS.primary, tension: 0.3 },
          { label: "Almuerzo", data: serieDiaria.map((d) => d.almuerzo), borderColor: COLORS.accent, backgroundColor: COLORS.accent, tension: 0.3 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
    });

    const porGrado = GRUPOS.map((g) => ({
      grupo: g,
      leche: DATA.estudiantes.filter((e) => e.grupo === g && e.programa === "vaso_leche").length,
      almuerzo: DATA.estudiantes.filter((e) => e.grupo === g && e.programa === "almuerzo").length,
    })).filter((g) => g.leche + g.almuerzo > 0);
    chartRegistry.porGrado = new Chart(document.getElementById("chart-por-grado"), {
      type: "bar",
      data: {
        labels: porGrado.map((g) => g.grupo),
        datasets: [
          { label: "Vaso de leche", data: porGrado.map((g) => g.leche), backgroundColor: COLORS.primary },
          { label: "Almuerzo", data: porGrado.map((g) => g.almuerzo), backgroundColor: COLORS.accent },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
    });

    const benef = DATA.entregas.filter((e) => e.tipo === "beneficiario").length;
    const redis = DATA.entregas.filter((e) => e.tipo === "redistribuido").length;
    chartRegistry.tipoEntrega = new Chart(document.getElementById("chart-tipo-entrega"), {
      type: "doughnut",
      data: {
        labels: ["Beneficiario", "Redistribuido"],
        datasets: [{ data: [benef, redis], backgroundColor: [COLORS.primary, COLORS.accent] }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
    });
  });

  return wrap;
}

/* ==================== ESTUDIANTES ==================== */

function renderEstudiantes(soloLectura) {
  const wrap = el(`<div>
    <div class="page-header page-header-row">
      <div>
        <h1>Estudiantes beneficiarios</h1>
        <p>Un estudiante solo puede estar en un programa: vaso de leche o almuerzo, nunca en los dos.</p>
      </div>
      ${!soloLectura ? `<button class="btn btn-accent" id="btn-nuevo-estudiante">+ Nuevo estudiante</button>` : ""}
    </div>

    <div class="toolbar">
      <div class="search-box"><span>🔎</span><input id="est-busqueda" placeholder="Buscar por nombre…" /></div>
      <select id="est-grupo"><option value="todos">Todos los grupos</option>
        ${GRADOS.map((g) => `<optgroup label="Grado ${g}°">
          ${SUBGRUPOS.map((s) => `<option value="${g}°${s}">${g}°${s}</option>`).join("")}
        </optgroup>`).join("")}
      </select>
      <select id="est-programa">
        <option value="todos">Ambos programas</option>
        <option value="vaso_leche">Vaso de leche</option>
        <option value="almuerzo">Almuerzo</option>
      </select>
      <span class="badge badge-neutral" id="est-contador">0 resultados</span>
    </div>

    <div class="card card-flush">
      <div class="table-wrap table-scroll">
        <table>
          <thead><tr>
            <th>QR ID</th><th>Nombre</th><th>Grupo</th><th>Programa</th><th>Estado</th>
          </tr></thead>
          <tbody id="est-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>`);

  function pintar() {
    const busqueda = wrap.querySelector("#est-busqueda").value.toLowerCase();
    const grupo = wrap.querySelector("#est-grupo").value;
    const programa = wrap.querySelector("#est-programa").value;

    const filtrados = DATA.estudiantes.filter(
      (e) =>
        (grupo === "todos" || e.grupo === grupo) &&
        (programa === "todos" || e.programa === programa) &&
        e.nombre.toLowerCase().includes(busqueda)
    );

    wrap.querySelector("#est-contador").textContent = `${filtrados.length} resultados`;

    const tbody = wrap.querySelector("#est-tbody");
    tbody.innerHTML = filtrados
      .map((e) => `
        <tr data-id="${e.id}">
          <td class="muted">${e.qrId}</td>
          <td><b>${e.nombre}</b></td>
          <td class="muted">🎓 ${e.grupo}</td>
          <td>
            ${soloLectura
              ? badgePrograma(e.programa)
              : `<select class="inline-select sel-programa" data-id="${e.id}">
                  <option value="vaso_leche" ${e.programa === "vaso_leche" ? "selected" : ""}>Vaso de leche</option>
                  <option value="almuerzo" ${e.programa === "almuerzo" ? "selected" : ""}>Almuerzo</option>
                </select>`}
          </td>
          <td>
            ${soloLectura
              ? badgeEstado(e.estado)
              : `<select class="inline-select sel-estado" data-id="${e.id}">
                  <option value="activo" ${e.estado === "activo" ? "selected" : ""}>Activo</option>
                  <option value="en_revision" ${e.estado === "en_revision" ? "selected" : ""}>En revisión</option>
                  <option value="suspendido" ${e.estado === "suspendido" ? "selected" : ""}>Suspendido</option>
                </select>`}
          </td>
        </tr>`)
      .join("");

    if (!soloLectura) {
      tbody.querySelectorAll(".sel-programa").forEach((sel) => {
        sel.addEventListener("change", (ev) => {
          // Un estudiante SOLO puede estar en un programa a la vez:
          // este cambio simplemente reemplaza el programa anterior por el nuevo.
          const est = estudiantePorId(Number(sel.dataset.id));
          est.programa = ev.target.value;
        });
      });
      tbody.querySelectorAll(".sel-estado").forEach((sel) => {
        sel.addEventListener("change", (ev) => {
          const est = estudiantePorId(Number(sel.dataset.id));
          est.estado = ev.target.value;
        });
      });
    }
  }

  wrap.querySelector("#est-busqueda").addEventListener("input", pintar);
  wrap.querySelector("#est-grupo").addEventListener("change", pintar);
  wrap.querySelector("#est-programa").addEventListener("change", pintar);
  pintar();
  return wrap;
}

/* ==================== HISTORIAL DE ENTREGAS ==================== */

function renderHistorial() {
  const wrap = el(`<div>
    <div class="page-header">
      <h1>Historial de entregas</h1>
      <p>Cada registro queda asociado a una fecha específica. Se muestra tanto lo entregado como lo no reclamado.</p>
    </div>

    <div class="toolbar">
      <select id="hist-fecha">${DATA.dias.map((d) => `<option value="${d}">${d}</option>`).join("")}</select>
      <select id="hist-programa">
        <option value="todos">Ambos programas</option>
        <option value="vaso_leche">Vaso de leche</option>
        <option value="almuerzo">Almuerzo</option>
      </select>
      <select id="hist-tipo">
        <option value="todos">Todos los tipos</option>
        <option value="beneficiario">Beneficiario</option>
        <option value="redistribuido">Redistribuido</option>
      </select>
      <button class="btn btn-ghost" id="btn-exportar-csv">⬇ Exportar CSV</button>
    </div>

    <div class="grid" style="grid-template-columns: 2fr 1fr;">
      <div class="card card-flush">
        <div class="table-wrap table-scroll">
          <table>
            <thead><tr>
              <th>Fecha</th><th>Estudiante</th><th>Grupo</th><th>Programa</th><th>Tipo</th><th>Registrado por</th>
            </tr></thead>
            <tbody id="hist-tbody"></tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <h3 id="hist-no-reclamo-titulo">❌ No reclamaron ese día</h3>
        <div class="mini-list" id="hist-no-reclamo-lista"></div>
      </div>
    </div>
  </div>`);

  function pintar() {
    const fecha = wrap.querySelector("#hist-fecha").value;
    const programa = wrap.querySelector("#hist-programa").value;
    const tipo = wrap.querySelector("#hist-tipo").value;

    const filtradas = DATA.entregas.filter(
      (e) =>
        e.fecha === fecha &&
        (programa === "todos" || e.programa === programa) &&
        (tipo === "todos" || e.tipo === tipo)
    );

    const tbody = wrap.querySelector("#hist-tbody");
    tbody.innerHTML = filtradas
      .map((en) => {
        const est = estudiantePorId(en.estudianteId);
        return `<tr>
          <td class="muted">${en.fecha}</td>
          <td><b>${est.nombre}</b></td>
          <td class="muted">${est.grupo}</td>
          <td>${badgePrograma(en.programa)}</td>
          <td>${badgeTipo(en.tipo)}</td>
          <td class="muted">${en.registradoPor}</td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">No hay registros para este filtro.</td></tr>`;

    const noReclamaron = DATA.faltas
      .filter((f) => f.fecha === fecha && (programa === "todos" || f.programa === programa))
      .map((f) => ({ ...estudiantePorId(f.estudianteId), programaNoReclamado: f.programa }));

    wrap.querySelector("#hist-no-reclamo-titulo").textContent = `❌ No reclamaron ese día (${noReclamaron.length})`;
    const lista = wrap.querySelector("#hist-no-reclamo-lista");
    lista.innerHTML = noReclamaron
      .map(
        (e) => `<div class="mini-row">
          <div><div class="nombre">${e.nombre}</div><div class="grupo">${e.grupo} · ${e.fecha ?? fecha}</div></div>
          ${badgePrograma(e.programaNoReclamado)}
        </div>`
      )
      .join("") || `<p class="muted" style="font-size:13px">Todos reclamaron ese día.</p>`;
  }

  wrap.querySelector("#hist-fecha").value = HOY;
  ["hist-fecha", "hist-programa", "hist-tipo"].forEach((id) =>
    wrap.querySelector(`#${id}`).addEventListener("change", pintar)
  );

  wrap.querySelector("#btn-exportar-csv").addEventListener("click", () => {
    const fecha = wrap.querySelector("#hist-fecha").value;
    const programa = wrap.querySelector("#hist-programa").value;
    const tipo = wrap.querySelector("#hist-tipo").value;
    const filtradas = DATA.entregas.filter(
      (e) =>
        e.fecha === fecha &&
        (programa === "todos" || e.programa === programa) &&
        (tipo === "todos" || e.tipo === tipo)
    );
    const filas = [["Fecha", "Estudiante", "Grupo", "Programa", "Tipo", "Registrado por"]];
    filtradas.forEach((en) => {
      const est = estudiantePorId(en.estudianteId);
      filas.push([en.fecha, est.nombre, est.grupo, PROGRAMA_LABEL[en.programa], en.tipo, en.registradoPor]);
    });
    const csv = filas.map((f) => f.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biopae_entregas_${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  pintar();
  return wrap;
}

/* ==================== CONTROL DIARIO (fecha por fecha, riguroso) ==================== */

function renderControlDiario() {
  const wrap = el(`<div>
    <div class="page-header">
      <h1>Control diario de reclamos</h1>
      <p>Registro riguroso, fecha por fecha, de qué estudiante reclamó y cuál no — independiente del resumen general de 14 días.</p>
    </div>

    <div class="toolbar">
      <select id="ctrl-fecha">${DATA.dias.map((d) => `<option value="${d}">${d}</option>`).join("")}</select>
      <select id="ctrl-programa">
        <option value="todos">Ambos programas</option>
        <option value="vaso_leche">Vaso de leche</option>
        <option value="almuerzo">Almuerzo</option>
      </select>
      <div class="search-box"><span>🔎</span><input id="ctrl-busqueda" placeholder="Buscar por nombre…" /></div>
    </div>

    <div class="control-summary" id="ctrl-resumen"></div>

    <div class="card card-flush">
      <div class="table-wrap table-scroll">
        <table>
          <thead><tr>
            <th>Fecha</th><th>Estudiante</th><th>Grupo</th><th>Programa</th><th>¿Reclamó?</th><th>Registrado por</th>
          </tr></thead>
          <tbody id="ctrl-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>`);

  function pintar() {
    const fecha = wrap.querySelector("#ctrl-fecha").value;
    const programa = wrap.querySelector("#ctrl-programa").value;
    const busqueda = wrap.querySelector("#ctrl-busqueda").value.toLowerCase();
    const programas = programa === "todos" ? ["vaso_leche", "almuerzo"] : [programa];

    const filasEstado = [];
    const faltasHoySet = new Set(
      DATA.faltas.filter((f) => f.fecha === fecha).map((f) => `${f.estudianteId}-${f.programa}`)
    );

    programas.forEach((p) => {
      DATA.estudiantes
        .filter((e) => e.programa === p)
        .forEach((e) => {
          const faltó = faltasHoySet.has(`${e.id}-${p}`);
          filasEstado.push({ estudiante: e, programa: p, reclamo: !faltó });
        });
    });

    const filtradas = filasEstado.filter((f) => f.estudiante.nombre.toLowerCase().includes(busqueda));
    const reclamaron = filtradas.filter((f) => f.reclamo).length;
    const noReclamaron = filtradas.length - reclamaron;

    wrap.querySelector("#ctrl-resumen").innerHTML = `
      <span class="badge badge-si">✔ Reclamaron: ${reclamaron}</span>
      <span class="badge badge-no">✘ No reclamaron: ${noReclamaron}</span>
      <span class="badge badge-neutral">🔁 Redistribuidos ese día: ${noReclamaron}</span>
    `;

    wrap.querySelector("#ctrl-tbody").innerHTML =
      filtradas
        .map(
          (f) => `<tr>
        <td class="muted">${fecha}</td>
        <td><b>${f.estudiante.nombre}</b></td>
        <td class="muted">${f.estudiante.grupo}</td>
        <td>${badgePrograma(f.programa)}</td>
        <td>${f.reclamo ? '<span class="badge badge-si">Sí reclamó</span>' : '<span class="badge badge-no">No reclamó</span>'}</td>
        <td class="muted">${REGISTRADO_POR}</td>
      </tr>`
        )
        .join("") || `<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Sin coincidencias.</td></tr>`;
  }

  wrap.querySelector("#ctrl-fecha").value = HOY;
  ["ctrl-fecha", "ctrl-programa"].forEach((id) => wrap.querySelector(`#${id}`).addEventListener("change", pintar));
  wrap.querySelector("#ctrl-busqueda").addEventListener("input", pintar);
  pintar();
  return wrap;
}

/* ==================== CASOS EN REVISIÓN ==================== */

function renderCasos(soloLectura) {
  const wrap = el(`<div>
    <div class="page-header">
      <h1>Casos en revisión</h1>
      <p>Estudiantes del programa de vaso de leche con inasistencias injustificadas y reiteradas en el reclamo, generados automáticamente para decidir si conservan el cupo.</p>
    </div>
    <div id="casos-lista" style="display:flex;flex-direction:column;gap:14px"></div>
  </div>`);

  function pintar() {
    const lista = wrap.querySelector("#casos-lista");
    if (DATA.casos.length === 0) {
      lista.innerHTML = `<p class="muted">No hay casos abiertos actualmente.</p>`;
      return;
    }
    lista.innerHTML = DATA.casos
      .map((c) => {
        const est = estudiantePorId(c.estudianteId);
        let accion;
        if (c.estado === "resuelto") {
          accion = `<span class="badge badge-si">Resuelto: ${c.decision === "mantener" ? "cupo mantenido" : "beneficio suspendido"}</span>`;
        } else if (soloLectura) {
          accion = `<span class="badge badge-en_revision">Pendiente de revisión</span>`;
        } else {
          accion = `
            <div class="caso-actions">
              <button class="btn btn-ghost btn-mantener" data-id="${c.id}">✔ Mantener cupo</button>
              <button class="btn btn-danger btn-suspender" data-id="${c.id}">✘ Suspender beneficio</button>
            </div>`;
        }
        return `<div class="card caso-card">
          <div class="caso-left">
            <div class="caso-icon">⚠️</div>
            <div>
              <div class="caso-title">${est.nombre} · ${est.grupo}</div>
              <div class="caso-motivo">${c.motivo}</div>
              <div class="caso-tags">
                ${badgePrograma(est.programa)}
                <span class="badge badge-no">${c.noReclamos} no reclamos (vaso de leche)</span>
                <span class="muted" style="font-size:12px">abierto el ${c.fechaApertura}</span>
              </div>
            </div>
          </div>
          ${accion}
        </div>`;
      })
      .join("");

    if (!soloLectura) {
      lista.querySelectorAll(".btn-mantener").forEach((b) =>
        b.addEventListener("click", () => decidirCaso(Number(b.dataset.id), "mantener", pintar))
      );
      lista.querySelectorAll(".btn-suspender").forEach((b) =>
        b.addEventListener("click", () => decidirCaso(Number(b.dataset.id), "suspender", pintar))
      );
    }
  }

  pintar();
  return wrap;
}

function decidirCaso(casoId, decision, callback) {
  const caso = DATA.casos.find((c) => c.id === casoId);
  const est = estudiantePorId(caso.estudianteId);
  est.estado = decision === "suspender" ? "suspendido" : "activo";
  caso.estado = "resuelto";
  caso.decision = decision;
  callback();
}

/* ==================== REPORTES ==================== */

function renderReportes() {
  const wrap = el(`<div>
    <div class="page-header page-header-row">
      <div>
        <h1>Reportes</h1>
        <p>Últimos ${DATA.dias.length} días hábiles (${DATA.dias[0]} a ${HOY}).</p>
      </div>
      <button class="btn btn-ghost">⬇ Exportar informe (PDF)</button>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3>Entregas por programa y tipo</h3>
        <div class="chart-box"><canvas id="chart-reporte-programa"></canvas></div>
      </div>
      <div class="card">
        <h3>Tasa de reclamo (%)</h3>
        <div id="tasa-reclamo" style="margin-top:8px"></div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:var(--primary-soft);color:var(--primary)">🔁</div>
        <div>
          <div class="kpi-value">${DATA.entregas.filter((e) => e.programa === "vaso_leche" && e.tipo === "redistribuido").length}</div>
          <div class="kpi-label">Vasos de leche redistribuidos (14 días)</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:var(--accent-soft);color:var(--accent-text)">🔁</div>
        <div>
          <div class="kpi-value">${DATA.entregas.filter((e) => e.programa === "almuerzo" && e.tipo === "redistribuido").length}</div>
          <div class="kpi-label">Almuerzos redistribuidos (14 días)</div>
        </div>
      </div>
    </div>
  </div>`);

  requestAnimationFrame(() => {
    const totalPorPrograma = ["vaso_leche", "almuerzo"].map((p) => ({
      programa: PROGRAMA_LABEL[p],
      beneficiario: DATA.entregas.filter((e) => e.programa === p && e.tipo === "beneficiario").length,
      redistribuido: DATA.entregas.filter((e) => e.programa === p && e.tipo === "redistribuido").length,
    }));
    chartRegistry.reportePrograma = new Chart(document.getElementById("chart-reporte-programa"), {
      type: "bar",
      data: {
        labels: totalPorPrograma.map((t) => t.programa),
        datasets: [
          { label: "Beneficiario", data: totalPorPrograma.map((t) => t.beneficiario), backgroundColor: COLORS.primary, stack: "s" },
          { label: "Redistribuido", data: totalPorPrograma.map((t) => t.redistribuido), backgroundColor: COLORS.accent, stack: "s" },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
    });

    const tasaReclamo = ["vaso_leche", "almuerzo"].map((p) => {
      const totalBenef = CAPACIDAD[p];
      const totalPosible = totalBenef * DATA.dias.length;
      const reclamados = DATA.entregas.filter((e) => e.programa === p && e.tipo === "beneficiario").length;
      return { programa: PROGRAMA_LABEL[p], tasa: totalPosible ? Math.round((reclamados / totalPosible) * 100) : 0, key: p };
    });

    wrap.querySelector("#tasa-reclamo").innerHTML = tasaReclamo
      .map(
        (t) => `<div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span>${t.programa}</span><span class="muted">${t.tasa}%</span>
          </div>
          <div style="width:100%;height:12px;border-radius:999px;background:var(--surface-alt);overflow:hidden">
            <div style="height:100%;width:${t.tasa}%;background:${t.key === "vaso_leche" ? COLORS.primary : COLORS.accent}"></div>
          </div>
        </div>`
      )
      .join("") + `<p class="muted" style="font-size:12px;margin-top:8px">
        Una tasa de reclamo baja y sostenida en un estudiante de vaso de leche es justamente lo que abre un caso en revisión.
      </p>`;
  });

  return wrap;
}

/* ==================== ARRANQUE ==================== */

document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  document.getElementById("btn-logout").addEventListener("click", cerrarSesion);
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => irAPagina(btn.dataset.page));
  });
});