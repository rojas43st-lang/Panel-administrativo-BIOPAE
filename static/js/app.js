document.addEventListener("DOMContentLoaded", () => {
    const login = document.getElementById("view-login");
    const app = document.getElementById("view-app");
    const contenido = document.getElementById("page-content");
    const menu = document.getElementById("nav-menu");

    if (!login || !app || !contenido || !menu) {
        console.error("BIOPAE: faltan elementos del index.html.");
        return;
    }

    const sesion = window.ADMIN_SESSION;

    if (!sesion) {
        login.classList.remove("hidden");
        app.classList.add("hidden");
        return;
    }

    login.classList.add("hidden");
    app.classList.remove("hidden");

    const usuario = document.getElementById("sidebar-usuario");
    const rol = document.getElementById("sidebar-rol");

    if (usuario) usuario.textContent = sesion.usuario || "Administrador";
    if (rol) rol.textContent = sesion.rol || "Coordinador";

    const fecha = document.getElementById("topbar-fecha");

    if (fecha) {
        fecha.textContent = new Intl.DateTimeFormat("es-CO", {
            dateStyle: "full"
        }).format(new Date());
    }

    /* ==================== FUNCIONES GENERALES ==================== */

    function mostrarEncabezado(titulo, descripcion) {
        contenido.innerHTML = "";

        const encabezado = document.createElement("div");
        encabezado.className = "page-header";

        const h1 = document.createElement("h1");
        h1.textContent = titulo;

        const p = document.createElement("p");
        p.textContent = descripcion;

        encabezado.append(h1, p);
        contenido.appendChild(encabezado);
    }

    function crearCelda(fila, valor) {
        const td = document.createElement("td");
        td.textContent =
            valor === null || valor === undefined || valor === ""
                ? "—"
                : String(valor);

        fila.appendChild(td);
    }

    function crearTabla(titulos, filasDatos) {
        const tabla = document.createElement("table");
        tabla.className = "admin-table";

        const thead = document.createElement("thead");
        const filaCabecera = document.createElement("tr");

        titulos.forEach(titulo => {
            const th = document.createElement("th");
            th.textContent = titulo;
            filaCabecera.appendChild(th);
        });

        thead.appendChild(filaCabecera);
        tabla.appendChild(thead);

        const tbody = document.createElement("tbody");

        filasDatos.forEach(valores => {
            const fila = document.createElement("tr");
            valores.forEach(valor => crearCelda(fila, valor));
            tbody.appendChild(fila);
        });

        tabla.appendChild(tbody);
        return tabla;
    }

    async function obtenerJSON(url, claveLista) {
        const respuesta = await fetch(url, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                Accept: "application/json"
            }
        });

        if (respuesta.status === 401) {
            throw new Error(
                "Tu sesión no está activa. Inicia sesión nuevamente."
            );
        }

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (!datos.ok || !Array.isArray(datos[claveLista])) {
            throw new Error(
                "La respuesta de la API no tiene el formato esperado."
            );
        }

        return datos;
    }

    /* ==================== PANEL GENERAL ==================== */

    async function mostrarPanelGeneral() {
        mostrarEncabezado(
            "Panel general",
            "Estado general de BIOPAE y resumen de las entregas registradas."
        );

        if (window.biopaeCharts) {
            window.biopaeCharts.forEach(chart => chart.destroy());
        }

        window.biopaeCharts = [];

        const tarjeta = document.createElement("div");
        tarjeta.className = "dashboard-biopae";

        tarjeta.innerHTML = `
            <div class="dashboard-banner">
                <span class="dashboard-banner-icon">🥛</span>
                <p>
                    <strong>Programa de Alimentación Escolar</strong><br>
                    Consulta los indicadores de estudiantes, alimentos y cupos
                    registrados en BIOPAE.
                </p>
            </div>

            <div class="dashboard-kpis">
                <article class="dashboard-kpi">
                    <div class="dashboard-kpi-icon icon-green">👥</div>
                    <div>
                        <p class="dashboard-kpi-label">Estudiantes activos</p>
                        <strong class="dashboard-kpi-value"
                                data-kpi="estudiantes">—</strong>
                        <span class="dashboard-kpi-note">
                            Estudiantes registrados como activos
                        </span>
                    </div>
                </article>

                <article class="dashboard-kpi">
                    <div class="dashboard-kpi-icon icon-gold">📋</div>
                    <div>
                        <p class="dashboard-kpi-label">Entregas registradas</p>
                        <strong class="dashboard-kpi-value"
                                data-kpi="entregas">—</strong>
                        <span class="dashboard-kpi-note">
                            Entregas de la última fecha registrada
                        </span>
                    </div>
                </article>

                <article class="dashboard-kpi">
                    <div class="dashboard-kpi-icon icon-green">🥛</div>
                    <div>
                        <p class="dashboard-kpi-label">Vasos de leche</p>
                        <strong class="dashboard-kpi-value"
                                data-kpi="leche">—</strong>
                        <span class="dashboard-kpi-note">
                            Entregas de leche en esa fecha
                        </span>
                    </div>
                </article>

                <article class="dashboard-kpi">
                    <div class="dashboard-kpi-icon icon-gold">🍽️</div>
                    <div>
                        <p class="dashboard-kpi-label">Almuerzos</p>
                        <strong class="dashboard-kpi-value"
                                data-kpi="almuerzos">—</strong>
                        <span class="dashboard-kpi-note">
                            Almuerzos entregados en esa fecha
                        </span>
                    </div>
                </article>
            </div>

            <div class="dashboard-lower">
                <article class="dashboard-info-card">
                    <div class="dashboard-section-heading">
                        <span>📦</span>
                        <h2>Control de cupos</h2>
                    </div>

                    <p class="dashboard-description">
                        Resumen de los cupos del registro más reciente.
                    </p>

                    <div class="dashboard-cupos">
                        <div class="dashboard-cupo">
                            <span class="dashboard-cupo-icon">🟢</span>
                            <div>
                                <span class="dashboard-cupo-label">
                                    Cupos disponibles
                                </span>
                                <strong data-kpi="disponibles">—</strong>
                            </div>
                        </div>

                        <div class="dashboard-cupo">
                            <span class="dashboard-cupo-icon">🟡</span>
                            <div>
                                <span class="dashboard-cupo-label">
                                    Cupos entregados
                                </span>
                                <strong data-kpi="entregados">—</strong>
                            </div>
                        </div>
                    </div>
                </article>

                <article class="dashboard-info-card dashboard-note-card">
                    <div class="dashboard-section-heading">
                        <span>ℹ️</span>
                        <h2>Seguimiento del programa</h2>
                    </div>

                    <p class="dashboard-description">
                        BIOPAE centraliza el registro de estudiantes y las
                        entregas de alimentos para facilitar el seguimiento
                        administrativo.
                    </p>

                    <div class="dashboard-note">
                        <strong>Información actualizada</strong>
                        <span>
                            Los datos se consultan desde la API de BIOPAE.
                        </span>
                    </div>
                </article>
            </div>

            <div class="dashboard-charts">
                <article class="dashboard-info-card dashboard-chart-card">
                    <div class="dashboard-section-heading">
                        <span>📈</span>
                        <h2>Historial de entregas</h2>
                    </div>

                    <p class="dashboard-description">
                        Cantidad de entregas registradas por fecha.
                    </p>

                    <div class="dashboard-chart-container">
                        <canvas id="graficaHistorial"></canvas>
                    </div>
                </article>

                <article class="dashboard-info-card dashboard-chart-card">
                    <div class="dashboard-section-heading">
                        <span>📊</span>
                        <h2>Entregas por alimento</h2>
                    </div>

                    <p class="dashboard-description">
                        Comparación entre vasos de leche y almuerzos.
                    </p>

                    <div class="dashboard-chart-container">
                        <canvas id="graficaAlimentos"></canvas>
                    </div>
                </article>

                <article class="dashboard-info-card dashboard-chart-card">
                    <div class="dashboard-section-heading">
                        <span>🍽️</span>
                        <h2>Distribución de alimentos</h2>
                    </div>

                    <p class="dashboard-description">
                        Proporción de cada alimento entre las entregas
                        registradas.
                    </p>

                    <div class="dashboard-chart-container dashboard-donut-container">
                        <canvas id="graficaDistribucion"></canvas>
                    </div>
                </article>
            </div>
        `;

        contenido.appendChild(tarjeta);

        try {
            const [respuestaEstadisticas, respuestaEntregas] =
                await Promise.all([
                    fetch("/api/admin/estadisticas", {
                        credentials: "same-origin",
                        headers: { Accept: "application/json" }
                    }),
                    fetch("/api/admin/entregas", {
                        credentials: "same-origin",
                        headers: { Accept: "application/json" }
                    })
                ]);

            if (
                respuestaEstadisticas.status === 401 ||
                respuestaEntregas.status === 401
            ) {
                throw new Error(
                    "Tu sesión ha expirado. Inicia sesión nuevamente."
                );
            }

            if (!respuestaEstadisticas.ok || !respuestaEntregas.ok) {
                throw new Error(
                    "No fue posible consultar los datos del panel."
                );
            }

            const datos = await respuestaEstadisticas.json();
            const datosEntregas = await respuestaEntregas.json();

            if (!datos.ok || !datosEntregas.ok) {
                throw new Error(
                    "La API no devolvió los datos esperados."
                );
            }

            if (!tarjeta.isConnected) return;

            const valores = {
                estudiantes: datos.estudiantes_activos,
                entregas: datos.entregas_hoy,
                leche: datos.vasos_leche,
                almuerzos: datos.almuerzos,
                disponibles: datos.cupos_disponibles,
                entregados: datos.cupos_entregados
            };

            Object.entries(valores).forEach(([clave, valor]) => {
                const elemento = tarjeta.querySelector(
                    `[data-kpi="${clave}"]`
                );

                if (elemento) {
                    elemento.textContent = valor ?? 0;
                }
            });

            const entregas = datosEntregas.entregas.filter(
                entrega =>
                    String(entrega.estado || "").toLowerCase() === "entregado"
            );

            const porFecha = {};

            entregas.forEach(entrega => {
                if (!entrega.fecha) return;
                porFecha[entrega.fecha] =
                    (porFecha[entrega.fecha] || 0) + 1;
            });

            const fechas = Object.keys(porFecha).sort();

            const etiquetasFechas = fechas.map(fecha => {
                const partes = fecha.split("-");
                return partes.length === 3
                    ? `${partes[2]}/${partes[1]}`
                    : fecha;
            });

            let totalLeche = 0;
            let totalAlmuerzos = 0;
            let otrosAlimentos = 0;

            entregas.forEach(entrega => {
                const alimento = String(
                    entrega.alimento || ""
                ).toLowerCase();

                if (alimento.includes("leche")) {
                    totalLeche++;
                } else if (alimento.includes("almuerzo")) {
                    totalAlmuerzos++;
                } else {
                    otrosAlimentos++;
                }
            });

            if (typeof Chart === "undefined") {
                throw new Error(
                    "No se pudo cargar Chart.js para mostrar las gráficas."
                );
            }

            const opcionesComunes = {
                responsive: true,
                maintainAspectRatio: false
            };

            window.biopaeCharts.push(
                new Chart(tarjeta.querySelector("#graficaHistorial"), {
                    type: "line",
                    data: {
                        labels: etiquetasFechas,
                        datasets: [{
                            label: "Entregas",
                            data: fechas.map(fecha => porFecha[fecha]),
                            borderColor: "#1F5D50",
                            backgroundColor: "rgba(31, 93, 80, 0.12)",
                            fill: true,
                            tension: 0.3,
                            pointRadius: 4,
                            pointBackgroundColor: "#1F5D50"
                        }]
                    },
                    options: {
                        ...opcionesComunes,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { precision: 0 }
                            }
                        }
                    }
                })
            );

            window.biopaeCharts.push(
                new Chart(tarjeta.querySelector("#graficaAlimentos"), {
                    type: "bar",
                    data: {
                        labels: ["Vasos de leche", "Almuerzos"],
                        datasets: [{
                            label: "Entregas",
                            data: [totalLeche, totalAlmuerzos],
                            backgroundColor: ["#1F5D50", "#E3A008"],
                            borderRadius: 8
                        }]
                    },
                    options: {
                        ...opcionesComunes,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { precision: 0 }
                            }
                        }
                    }
                })
            );

            const etiquetasDistribucion = [
                "Vasos de leche",
                "Almuerzos"
            ];

            const valoresDistribucion = [
                totalLeche,
                totalAlmuerzos
            ];

            if (otrosAlimentos > 0) {
                etiquetasDistribucion.push("Otros alimentos");
                valoresDistribucion.push(otrosAlimentos);
            }

            window.biopaeCharts.push(
                new Chart(tarjeta.querySelector("#graficaDistribucion"), {
                    type: "doughnut",
                    data: {
                        labels: etiquetasDistribucion,
                        datasets: [{
                            data: valoresDistribucion,
                            backgroundColor: [
                                "#1F5D50",
                                "#E3A008",
                                "#86B7A5"
                            ],
                            borderWidth: 2,
                            borderColor: "#FFFFFF"
                        }]
                    },
                    options: {
                        ...opcionesComunes,
                        cutout: "65%",
                        plugins: {
                            legend: { position: "bottom" }
                        }
                    }
                })
            );
        } catch (error) {
            console.error(
                "BIOPAE: error cargando panel general:",
                error
            );

            if (tarjeta.isConnected) {
                const aviso = document.createElement("p");
                aviso.className = "error-box";
                aviso.textContent =
                    error.message ||
                    "No fue posible cargar los datos del panel.";

                tarjeta.prepend(aviso);
            }
        }
    }
        /* ==================== ESTUDIANTES ==================== */

    async function mostrarEstudiantes() {
        mostrarEncabezado(
            "Estudiantes",
            "Listado de estudiantes consultado directamente desde Neon."
        );

        const tarjeta = document.createElement("div");
        tarjeta.className = "admin-panel-card";

        const estado = document.createElement("p");
        estado.textContent = "Cargando estudiantes...";

        const tablaContenedor = document.createElement("div");
        tablaContenedor.style.overflowX = "auto";

        tarjeta.append(estado, tablaContenedor);
        contenido.appendChild(tarjeta);

        try {
            const datos = await obtenerJSON(
                "/api/admin/estudiantes",
                "estudiantes"
            );

            if (!tarjeta.isConnected) return;

            estado.textContent = `Total de estudiantes: ${datos.total}`;

            if (datos.estudiantes.length === 0) {
                tablaContenedor.textContent =
                    "No hay estudiantes registrados.";
                return;
            }

            const filas = datos.estudiantes.map(estudiante => [
                estudiante.documento,
                estudiante.nombre,
                estudiante.apellido,
                estudiante.grupo,
                estudiante.beneficio || "No beneficiario",
                estudiante.activo ? "Activo" : "Inactivo"
            ]);

            tablaContenedor.replaceChildren(
                crearTabla(
                    [
                        "Documento",
                        "Nombre",
                        "Apellido",
                        "Grupo",
                        "Beneficio",
                        "Estado"
                    ],
                    filas
                )
            );
        } catch (error) {
            console.error("Error cargando estudiantes:", error);
            if (tarjeta.isConnected) {
                estado.textContent =
                    error.message || "No se pudieron cargar los estudiantes.";
            }
        }
    }

    /* ==================== HISTORIAL DE ENTREGAS ==================== */

    async function mostrarHistorial() {
        mostrarEncabezado(
            "Historial de entregas",
            "Registro de alimentos entregados, consultado desde Neon."
        );

        const tarjeta = document.createElement("div");
        tarjeta.className = "admin-panel-card";

        const estado = document.createElement("p");
        estado.textContent = "Cargando historial de entregas...";

        const tablaContenedor = document.createElement("div");
        tablaContenedor.style.overflowX = "auto";

        tarjeta.append(estado, tablaContenedor);
        contenido.appendChild(tarjeta);

        try {
            const datos = await obtenerJSON(
                "/api/admin/entregas",
                "entregas"
            );

            if (!tarjeta.isConnected) return;

            estado.textContent = `Total de entregas: ${datos.total}`;

            if (datos.entregas.length === 0) {
                tablaContenedor.textContent =
                    "No hay entregas registradas.";
                return;
            }

            const filas = datos.entregas.map(entrega => [
                entrega.fecha,
                entrega.hora,
                entrega.documento,
                `${entrega.nombre || ""} ${entrega.apellido || ""}`.trim(),
                entrega.alimento,
                entrega.tipo_entrega,
                entrega.estado
            ]);

            tablaContenedor.replaceChildren(
                crearTabla(
                    [
                        "Fecha",
                        "Hora",
                        "Documento",
                        "Estudiante",
                        "Alimento",
                        "Tipo de entrega",
                        "Estado"
                    ],
                    filas
                )
            );
        } catch (error) {
            console.error("Error cargando historial:", error);
            if (tarjeta.isConnected) {
                estado.textContent =
                    error.message ||
                    "No fue posible cargar el historial de entregas.";
            }
        }
    }

    /* ==================== CONTROL DIARIO ==================== */

    async function mostrarControlDiario() {
        mostrarEncabezado(
            "Control diario de reclamos",
            "Consulta por fecha los estudiantes con entregas registradas en BIOPAE."
        );

        const panel = document.createElement("section");
        panel.className = "admin-panel-card control-reclamos";

        panel.innerHTML = `
            <div class="control-filtros">
                <label>
                    <span>Fecha</span>
                    <input id="reclamos-fecha" type="date">
                </label>

                <label>
                    <span>Programa</span>
                    <select id="reclamos-programa">
                        <option value="todos">Ambos programas</option>
                        <option value="leche">Vaso de leche</option>
                        <option value="almuerzo">Almuerzo</option>
                    </select>
                </label>

                <label class="control-buscador">
                    <span>Buscar por nombre</span>
                    <input
                        id="reclamos-busqueda"
                        type="search"
                        placeholder="Buscar por nombre..."
                    >
                </label>
            </div>

            <div class="control-indicadores">
                <span class="indicador indicador-si">
                    ✓ Entregas confirmadas:
                    <strong id="total-reclamaron">0</strong>
                </span>

                <span class="indicador indicador-no">
                    ✕ No reclamaron:
                    <strong id="total-no-reclamaron">No disponible</strong>
                </span>

                <span class="indicador indicador-redistribuidos">
                    ▣ Redistribuidos ese día:
                    <strong id="total-redistribuidos">No disponible</strong>
                </span>
            </div>

            <p id="reclamos-estado" role="status">
                Consultando los registros de BIOPAE...
            </p>

            <div class="table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Estudiante</th>
                            <th>Grupo</th>
                            <th>Programa</th>
                            <th>¿Reclamó?</th>
                            <th>Registrado por</th>
                        </tr>
                    </thead>
                    <tbody id="reclamos-tabla"></tbody>
                </table>
            </div>
        `;

        contenido.appendChild(panel);

        const fechaInput = panel.querySelector("#reclamos-fecha");
        const programaInput = panel.querySelector("#reclamos-programa");
        const busquedaInput = panel.querySelector("#reclamos-busqueda");
        const cuerpo = panel.querySelector("#reclamos-tabla");
        const estado = panel.querySelector("#reclamos-estado");

        const hoy = new Date();

        fechaInput.value = [
            hoy.getFullYear(),
            String(hoy.getMonth() + 1).padStart(2, "0"),
            String(hoy.getDate()).padStart(2, "0")
        ].join("-");

        let estudiantes = [];
        let entregas = [];

        const normalizar = valor =>
            String(valor ?? "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim();

        function agregarCelda(fila, valor) {
            crearCelda(fila, valor);
        }

        function actualizarTabla() {
            if (!panel.isConnected) return;

            const fechaSeleccionada = fechaInput.value;
            const programaSeleccionado = programaInput.value;
            const busqueda = normalizar(busquedaInput.value);

            const entregasDia = entregas.filter(entrega => {
                if (entrega.fecha !== fechaSeleccionada) return false;

                if (normalizar(entrega.estado) !== "entregado") {
                    return false;
                }

                const alimento = normalizar(entrega.alimento);

                if (
                    programaSeleccionado === "leche" &&
                    !alimento.includes("leche")
                ) return false;

                if (
                    programaSeleccionado === "almuerzo" &&
                    !alimento.includes("almuerzo")
                ) return false;

                return true;
            });

            const entregasPorDocumento = new Map();

            entregasDia.forEach(entrega => {
                const documento = String(entrega.documento ?? "");
                if (!documento) return;

                if (!entregasPorDocumento.has(documento)) {
                    entregasPorDocumento.set(documento, []);
                }

                entregasPorDocumento.get(documento).push(entrega);
            });

            const filas = [];

            estudiantes
                .filter(estudiante => estudiante.activo === true)
                .filter(estudiante =>
                    normalizar(
                        `${estudiante.nombre ?? ""} ${estudiante.apellido ?? ""}`
                    ).includes(busqueda)
                )
                .forEach(estudiante => {
                    const documento = String(estudiante.documento ?? "");
                    const registros =
                        entregasPorDocumento.get(documento) || [];

                    if (programaSeleccionado === "todos") {
                        if (registros.length) {
                            registros.forEach(entrega => {
                                filas.push({
                                    estudiante,
                                    entrega,
                                    reclamo: true
                                });
                            });
                        } else {
                            filas.push({
                                estudiante,
                                entrega: null,
                                reclamo: false
                            });
                        }

                        return;
                    }

                    registros.forEach(entrega => {
                        filas.push({
                            estudiante,
                            entrega,
                            reclamo: true
                        });
                    });
                });

            cuerpo.replaceChildren();

            filas.forEach(({ estudiante, entrega, reclamo }) => {
                const fila = document.createElement("tr");

                agregarCelda(fila, fechaSeleccionada);
                agregarCelda(
                    fila,
                    `${estudiante.nombre ?? ""} ${estudiante.apellido ?? ""}`.trim()
                );
                agregarCelda(fila, estudiante.grupo);
                agregarCelda(
                    fila,
                    entrega?.alimento ?? "Sin entrega registrada"
                );
                agregarCelda(
                    fila,
                    reclamo ? "Sí reclamó" : "Sin registro"
                );
                agregarCelda(fila, "—");

                cuerpo.appendChild(fila);
            });

            panel.querySelector("#total-reclamaron").textContent =
                entregasDia.length;

            panel.querySelector("#total-no-reclamaron").textContent =
                "No disponible";

            panel.querySelector("#total-redistribuidos").textContent =
                "No disponible";

            estado.textContent = filas.length
                ? `${filas.length} registros mostrados para ${fechaSeleccionada}.`
                : "No hay registros que coincidan con la fecha y los filtros.";

            if (programaSeleccionado !== "todos") {
                estado.textContent +=
                    " Se muestran las entregas confirmadas del programa.";
            }
        }

        try {
            const [datosEstudiantes, datosEntregas] = await Promise.all([
                obtenerJSON("/api/admin/estudiantes", "estudiantes"),
                obtenerJSON("/api/admin/entregas", "entregas")
            ]);

            if (!panel.isConnected) return;

            estudiantes = datosEstudiantes.estudiantes;
            entregas = datosEntregas.entregas;

            actualizarTabla();
        } catch (error) {
            console.error("Error cargando Control diario:", error);
            estado.textContent =
                error.message || "No fue posible cargar los datos de Neon.";
        }

        fechaInput.addEventListener("change", actualizarTabla);
        programaInput.addEventListener("change", actualizarTabla);
        busquedaInput.addEventListener("input", actualizarTabla);
    }
    /* =========================================================
   CASOS EN REVISIÓN
   ========================================================= */

async function mostrarCasosRevision() {
  const contenedor = document.getElementById("page-content");

  if (!contenedor) {
    console.error("No se encontró el contenedor page-content.");
    return;
  }

  contenedor.innerHTML = `
    <div class="page-header">
      <h1>Casos en revisión</h1>
      <p>Consulta las novedades de los beneficiarios y toma decisiones
      sobre la continuidad de sus beneficios.</p>
    </div>

    <div class="toolbar">
      <button class="btn btn-primary" id="btn-nuevo-caso">
        + Registrar caso manual
      </button>

      <button class="btn btn-secondary" id="btn-actualizar-casos">
        Actualizar
      </button>
    </div>

    <div id="formulario-caso-container"></div>

    <div id="casos-resumen" class="stats-grid">
      <div class="stat-card">
        <h3>Casos pendientes</h3>
        <p id="total-casos-pendientes">...</p>
      </div>

      <div class="stat-card">
        <h3>Casos resueltos</h3>
        <p id="total-casos-resueltos">...</p>
      </div>
    </div>

    <div id="casos-listado">
      <p>Cargando casos desde la base de datos...</p>
    </div>
  `;

  document.getElementById("btn-nuevo-caso")
    .addEventListener("click", mostrarFormularioCaso);

  document.getElementById("btn-actualizar-casos")
    .addEventListener("click", cargarCasosRevision);

  await cargarCasosRevision();
}


/* Cargar los casos desde FastAPI */

async function cargarCasosRevision() {
  const listado = document.getElementById("casos-listado");

  if (!listado) return;

  listado.innerHTML = "<p>Consultando casos...</p>";

  try {
    const respuesta = await fetch("/api/admin/casos-revision", {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      credentials: "same-origin"
    });

    if (!respuesta.ok) {
      throw new Error(`Error del servidor: ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    /*
      La API puede devolver directamente una lista
      o un objeto con la propiedad "casos".
    */
    const casos = Array.isArray(datos)
      ? datos
      : (datos.casos || []);

    const pendientes = casos.filter(
      caso => caso.estado === "pendiente"
    );

    const resueltos = casos.filter(
      caso => caso.estado === "resuelto"
    );

    const totalPendientes = document.getElementById(
      "total-casos-pendientes"
    );

    const totalResueltos = document.getElementById(
      "total-casos-resueltos"
    );

    if (totalPendientes) {
      totalPendientes.textContent = pendientes.length;
    }

    if (totalResueltos) {
      totalResueltos.textContent = resueltos.length;
    }

    if (casos.length === 0) {
      listado.innerHTML = `
        <div class="empty-state">
          <h3>No hay casos registrados</h3>
          <p>
            Cuando se detecten novedades o registres un caso manual,
            aparecerá aquí.
          </p>
        </div>
      `;
      return;
    }

    listado.innerHTML = `
      <div class="casos-grid">
        ${casos.map(caso => crearTarjetaCaso(caso)).join("")}
      </div>
    `;

    listado.querySelectorAll("[data-decision]").forEach(boton => {
      boton.addEventListener("click", async () => {
        const id = boton.dataset.id;
        const decision = boton.dataset.decision;

        await resolverCaso(id, decision);
      });
    });

  } catch (error) {
    console.error("Error al cargar los casos:", error);

    listado.innerHTML = `
      <div class="error-message">
        <h3>No se pudieron cargar los casos</h3>
        <p>${escaparHTML(error.message)}</p>
        <button class="btn btn-secondary"
                onclick="cargarCasosRevision()">
          Intentar nuevamente
        </button>
      </div>
    `;
  }
}


/* Crear la tarjeta visual de cada caso */

function crearTarjetaCaso(caso) {
  const nombre = [
    caso.nombre || caso.nombres || "",
    caso.apellido || caso.apellidos || ""
  ].filter(Boolean).join(" ").trim() || "Estudiante sin nombre";

  const grupo = caso.grupo || "Sin grupo";
  const beneficio = caso.tipo_beneficio || "No especificado";
  const motivo = caso.motivo || "Sin motivo registrado";
  const dias = Number(caso.dias_sin_reclamar || 0);

  const fecha = caso.fecha_apertura
    ? new Date(caso.fecha_apertura).toLocaleDateString("es-CO")
    : "Sin fecha";

  const estado = caso.estado || "pendiente";
  const origen = caso.origen === "automatico"
    ? "Automático"
    : "Manual";

  const esPendiente = estado === "pendiente";

  return `
    <article class="caso-card">
      <div class="caso-card-header">
        <div>
          <h3>${escaparHTML(nombre)}</h3>
          <p>Grupo: ${escaparHTML(grupo)}</p>
        </div>

        <span class="caso-estado caso-estado-${escaparHTML(estado)}">
          ${escaparHTML(estado)}
        </span>
      </div>

      <div class="caso-card-body">
        <p>
          <strong>Beneficio:</strong>
          ${escaparHTML(beneficio)}
        </p>

        <p>
          <strong>Motivo:</strong>
          ${escaparHTML(motivo)}
        </p>

        <p>
          <strong>Días sin reclamar:</strong>
          ${dias}
        </p>

        <p>
          <strong>Fecha de apertura:</strong>
          ${escaparHTML(fecha)}
        </p>

        <p>
          <strong>Origen del caso:</strong>
          ${escaparHTML(origen)}
        </p>
      </div>

      ${
        esPendiente
          ? `
            <div class="caso-card-actions">
              <button
                class="btn btn-success"
                data-id="${Number(caso.id)}"
                data-decision="mantener_cupo">
                Mantener cupo
              </button>

              <button
                class="btn btn-danger"
                data-id="${Number(caso.id)}"
                data-decision="suspender_beneficio">
                Suspender beneficio
              </button>
            </div>
          `
          : `
            <div class="caso-resolucion">
              <p>
                <strong>Decisión:</strong>
                ${escaparHTML(
                  caso.decision === "mantener_cupo"
                    ? "Se mantiene el cupo"
                    : caso.decision === "suspender_beneficio"
                      ? "Beneficio suspendido"
                      : "Sin decisión registrada"
                )}
              </p>

              ${
                caso.observacion_resolucion
                  ? `<p><strong>Observación:</strong>
                     ${escaparHTML(caso.observacion_resolucion)}</p>`
                  : ""
              }
            </div>
          `
      }
    </article>
  `;
}


/* Resolver un caso */

async function resolverCaso(id, decision) {
  const decisionTexto = decision === "mantener_cupo"
    ? "mantener el cupo"
    : "suspender el beneficio";

  const confirmado = confirm(
    `¿Confirmas que deseas ${decisionTexto} para este caso?`
  );

  if (!confirmado) return;

  const observacion = prompt(
    "Escribe una observación para registrar la decisión (opcional):"
  );

  try {
    const respuesta = await fetch(
      `/api/admin/casos-revision/${Number(id)}/resolver`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({
          decision: decision,
          observacion_resolucion: observacion || ""
        })
      }
    );

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        datos.detail || "No fue posible resolver el caso."
      );
    }

    alert(datos.mensaje || "Caso resuelto correctamente.");

    await cargarCasosRevision();

  } catch (error) {
    console.error("Error al resolver el caso:", error);
    alert(`No se pudo resolver el caso: ${error.message}`);
  }
}


/* Formulario para registrar un caso manual */

async function mostrarFormularioCaso() {
  const contenedor = document.getElementById(
    "formulario-caso-container"
  );

  if (!contenedor) return;

  contenedor.innerHTML = `
    <section class="form-card">
      <h2>Registrar caso manual</h2>
      <p>
        Registra una situación que requiera revisión por parte
        de la coordinación.
      </p>

      <form id="form-nuevo-caso">
        <div class="form-group">
          <label for="caso-estudiante">Estudiante</label>

          <select id="caso-estudiante"
                  name="estudiante_id"
                  required>
            <option value="">Cargando estudiantes...</option>
          </select>
        </div>

        <div class="form-group">
          <label for="caso-beneficio">Tipo de beneficio</label>

          <select id="caso-beneficio"
                  name="tipo_beneficio"
                  required>
            <option value="">Selecciona el beneficio</option>
            <option value="vaso de leche">Vaso de leche</option>
            <option value="almuerzo">Almuerzo</option>
          </select>
        </div>

        <div class="form-group">
          <label for="caso-motivo">Motivo de revisión</label>

          <textarea id="caso-motivo"
                    name="motivo"
                    rows="4"
                    maxlength="1000"
                    placeholder="Describe la situación..."
                    required></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            Registrar caso
          </button>

          <button type="button"
                  class="btn btn-secondary"
                  id="btn-cancelar-caso">
            Cancelar
          </button>
        </div>

        <p id="caso-form-mensaje"></p>
      </form>
    </section>
  `;

  document.getElementById("btn-cancelar-caso")
    .addEventListener("click", () => {
      contenedor.innerHTML = "";
    });

  const select = document.getElementById("caso-estudiante");

  try {
    const respuesta = await fetch("/api/admin/estudiantes", {
      credentials: "same-origin",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!respuesta.ok) {
      throw new Error("No se pudieron consultar los estudiantes.");
    }

    const datos = await respuesta.json();

    const estudiantes = Array.isArray(datos)
      ? datos
      : (datos.estudiantes || []);

    select.innerHTML = `
      <option value="">Selecciona un estudiante</option>
      ${estudiantes.map(estudiante => {
        const nombre = [
          estudiante.nombre || estudiante.nombres || "",
          estudiante.apellido || estudiante.apellidos || ""
        ].filter(Boolean).join(" ").trim();

        return `
          <option value="${Number(estudiante.id)}">
            ${escaparHTML(nombre || "Estudiante sin nombre")}
            — Grupo: ${escaparHTML(estudiante.grupo || "Sin grupo")}
          </option>
        `;
      }).join("")}
    `;

  } catch (error) {
    console.error(error);

    select.innerHTML = `
      <option value="">Error al cargar estudiantes</option>
    `;
  }

  document.getElementById("form-nuevo-caso")
    .addEventListener("submit", registrarCasoManual);
}


async function registrarCasoManual(evento) {
  evento.preventDefault();

  const formulario = evento.currentTarget;
  const mensaje = document.getElementById("caso-form-mensaje");
  const boton = formulario.querySelector('button[type="submit"]');

  const datos = {
    estudiante_id: Number(
      document.getElementById("caso-estudiante").value
    ),
    tipo_beneficio: document.getElementById("caso-beneficio").value,
    motivo: document.getElementById("caso-motivo").value.trim()
  };

  if (
    !datos.estudiante_id ||
    !datos.tipo_beneficio ||
    !datos.motivo
  ) {
    mensaje.textContent = "Completa todos los campos obligatorios.";
    return;
  }

  boton.disabled = true;
  mensaje.textContent = "Registrando caso...";

  try {
    const respuesta = await fetch("/api/admin/casos-revision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify(datos)
    });

    const resultado = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.detail || "No se pudo registrar el caso."
      );
    }

    mensaje.textContent = resultado.mensaje ||
      "Caso registrado correctamente.";

    formulario.reset();

    await cargarCasosRevision();

  } catch (error) {
    console.error("Error al registrar el caso:", error);
    mensaje.textContent = error.message;
  } finally {
    boton.disabled = false;
  }
}


/* =========================================================
   REPORTES
   ========================================================= */

async function mostrarReportes() {
  const contenedor = document.getElementById("page-content");

  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="page-header">
      <h1>Reportes</h1>
      <p>Consulta y exporta la información registrada en BIOPAE.</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total de estudiantes</h3>
        <p id="reporte-estudiantes">...</p>
      </div>

      <div class="stat-card">
        <h3>Entregas registradas</h3>
        <p id="reporte-entregas">...</p>
      </div>

      <div class="stat-card">
        <h3>Casos pendientes</h3>
        <p id="reporte-casos">...</p>
      </div>
    </div>

    <div class="report-actions">
      <button class="btn btn-primary" id="btn-exportar-estudiantes">
        Exportar estudiantes CSV
      </button>

      <button class="btn btn-secondary" id="btn-exportar-entregas">
        Exportar entregas CSV
      </button>
    </div>

    <p id="mensaje-reportes"></p>
  `;

  try {
    const [resEstudiantes, resEntregas, resCasos] = await Promise.all([
      fetch("/api/admin/estudiantes", {
        credentials: "same-origin"
      }),
      fetch("/api/admin/entregas", {
        credentials: "same-origin"
      }),
      fetch("/api/admin/casos-revision", {
        credentials: "same-origin"
      })
    ]);

    if (!resEstudiantes.ok || !resEntregas.ok || !resCasos.ok) {
      throw new Error("No fue posible consultar todos los reportes.");
    }

    const estudiantesJSON = await resEstudiantes.json();
    const entregasJSON = await resEntregas.json();
    const casosJSON = await resCasos.json();

    const estudiantes = Array.isArray(estudiantesJSON)
      ? estudiantesJSON
      : (estudiantesJSON.estudiantes || []);

    const entregas = Array.isArray(entregasJSON)
      ? entregasJSON
      : (entregasJSON.entregas || []);

    const casos = Array.isArray(casosJSON)
      ? casosJSON
      : (casosJSON.casos || []);

    document.getElementById("reporte-estudiantes").textContent =
      estudiantes.length;

    document.getElementById("reporte-entregas").textContent =
      entregas.length;

    document.getElementById("reporte-casos").textContent =
      casos.filter(caso => caso.estado === "pendiente").length;

    document.getElementById("btn-exportar-estudiantes")
      .addEventListener("click", () => {
        exportarCSV(
          estudiantes,
          "reporte_estudiantes.csv"
        );
      });

    document.getElementById("btn-exportar-entregas")
      .addEventListener("click", () => {
        exportarCSV(
          entregas,
          "reporte_entregas.csv"
        );
      });

  } catch (error) {
    console.error("Error al generar los reportes:", error);

    document.getElementById("mensaje-reportes").textContent =
      `Error al cargar los reportes: ${error.message}`;
  }
}


/* Exportar datos a CSV */

function exportarCSV(registros, nombreArchivo) {
  if (!Array.isArray(registros) || registros.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }

  const columnas = [
    ...new Set(registros.flatMap(registro => Object.keys(registro)))
  ];

  const escaparCSV = valor => {
    if (valor === null || valor === undefined) return "";

    const texto = String(valor).replace(/"/g, '""');

    return `"${texto}"`;
  };

  const filas = [
    columnas.map(escaparCSV).join(";"),
    ...registros.map(registro =>
      columnas.map(columna => escaparCSV(registro[columna])).join(";")
    )
  ];

  const contenido = "\uFEFF" + filas.join("\r\n");
  const archivo = new Blob([contenido], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreArchivo;

  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  URL.revokeObjectURL(url);
}


/* =========================================================
   UTILIDADES Y NAVEGACIÓN
   ========================================================= */

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => {
    const entidades = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entidades[caracter];
  });
}


/*
  Estas funciones permiten conectar las opciones del menú.
  Si tu app.js ya tiene una función de navegación con estos
  nombres, conserva la que ya existe y no la dupliques.
*/

function irAPagina(pagina) {
  const paginas = {
    dashboard: mostrarPanelGeneral,
    estudiantes: mostrarEstudiantes,
    historial: mostrarHistorial,
    control: mostrarControlDiario,
    controlDiario: mostrarControlDiario,
    casos: mostrarCasosRevision,
    casosRevision: mostrarCasosRevision,
    reportes: mostrarReportes
  };

  const funcion = paginas[pagina];

  if (typeof funcion === "function") {
    funcion();
  } else {
    console.warn("Página no reconocida:", pagina);
  }
}


/* Inicializar la navegación del panel */

const enlaces = document.querySelectorAll("[data-pagina]");

enlaces.forEach(enlace => {
    enlace.addEventListener("click", evento => {
        evento.preventDefault();

        const pagina = enlace.dataset.pagina;

        if (pagina) {
            irAPagina(pagina);
        }
    });
});

    // Mostrar el panel general al iniciar la sesión
irAPagina("dashboard");
});
