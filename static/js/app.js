
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
            headers: { Accept: "application/json" }
        });

        if (respuesta.status === 401) {
            throw new Error("Tu sesión no está activa. Inicia sesión nuevamente.");
        }

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (!datos.ok || !Array.isArray(datos[claveLista])) {
            throw new Error("La respuesta de la API no tiene el formato esperado.");
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
                        <strong class="dashboard-kpi-value" data-kpi="estudiantes">—</strong>
                        <span class="dashboard-kpi-note">Estudiantes registrados como activos</span>
                    </div>
                </article>

                <article class="dashboard-kpi">
                    <div class="dashboard-kpi-icon icon-gold">📋</div>
                    <div>
                        <p class="dashboard-kpi-label">Entregas registradas</p>
                        <strong class="dashboard-kpi-value" data-kpi="entregas">—</strong>
                        <span class="dashboard-kpi-note">Entregas de la última fecha registrada</span>
                    </div>
                </article>

                <article class="dashboard-kpi">
                    <div class="dashboard-kpi-icon icon-green">🥛</div>
                    <div>
                        <p class="dashboard-kpi-label">Vasos de leche</p>
                        <strong class="dashboard-kpi-value" data-kpi="leche">—</strong>
                        <span class="dashboard-kpi-note">Entregas de leche en esa fecha</span>
                    </div>
                </article>

                <article class="dashboard-kpi">
                    <div class="dashboard-kpi-icon icon-gold">🍽️</div>
                    <div>
                        <p class="dashboard-kpi-label">Almuerzos</p>
                        <strong class="dashboard-kpi-value" data-kpi="almuerzos">—</strong>
                        <span class="dashboard-kpi-note">Almuerzos entregados en esa fecha</span>
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
                                <span class="dashboard-cupo-label">Cupos disponibles</span>
                                <strong data-kpi="disponibles">—</strong>
                            </div>
                        </div>
                        <div class="dashboard-cupo">
                            <span class="dashboard-cupo-icon">🟡</span>
                            <div>
                                <span class="dashboard-cupo-label">Cupos entregados</span>
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
                        BIOPAE centraliza el registro de estudiantes y las entregas
                        de alimentos para facilitar el seguimiento administrativo.
                    </p>
                    <div class="dashboard-note">
                        <strong>Información actualizada</strong>
                        <span>Los datos se consultan desde la API de BIOPAE.</span>
                    </div>
                </article>
            </div>

            <div class="dashboard-charts">
                <article class="dashboard-info-card dashboard-chart-card">
                    <div class="dashboard-section-heading">
                        <span>📈</span>
                        <h2>Historial de entregas</h2>
                    </div>
                    <p class="dashboard-description">Cantidad de entregas registradas por fecha.</p>
                    <div class="dashboard-chart-container">
                        <canvas id="graficaHistorial"></canvas>
                    </div>
                </article>

                <article class="dashboard-info-card dashboard-chart-card">
                    <div class="dashboard-section-heading">
                        <span>📊</span>
                        <h2>Entregas por alimento</h2>
                    </div>
                    <p class="dashboard-description">Comparación entre vasos de leche y almuerzos.</p>
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
                        Proporción de cada alimento entre las entregas registradas.
                    </p>
                    <div class="dashboard-chart-container dashboard-donut-container">
                        <canvas id="graficaDistribucion"></canvas>
                    </div>
                </article>
            </div>
        `;

        contenido.appendChild(tarjeta);

        try {
            const [respuestaEstadisticas, respuestaEntregas] = await Promise.all([
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
                throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");
            }

            if (!respuestaEstadisticas.ok || !respuestaEntregas.ok) {
                throw new Error("No fue posible consultar los datos del panel.");
            }

            const datos = await respuestaEstadisticas.json();
            const datosEntregas = await respuestaEntregas.json();

            if (!datos.ok || !datosEntregas.ok) {
                throw new Error("La API no devolvió los datos esperados.");
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
                const elemento = tarjeta.querySelector(`[data-kpi="${clave}"]`);
                if (elemento) elemento.textContent = valor ?? 0;
            });

            const entregas = datosEntregas.entregas.filter(
                entrega => String(entrega.estado || "").toLowerCase() === "entregado"
            );

            const porFecha = {};
            entregas.forEach(entrega => {
                if (!entrega.fecha) return;
                porFecha[entrega.fecha] = (porFecha[entrega.fecha] || 0) + 1;
            });

            const fechas = Object.keys(porFecha).sort();
            const etiquetasFechas = fechas.map(fecha => {
                const partes = fecha.split("-");
                return partes.length === 3 ? `${partes[2]}/${partes[1]}` : fecha;
            });

            let totalLeche = 0;
            let totalAlmuerzos = 0;
            let otrosAlimentos = 0;

            entregas.forEach(entrega => {
                const alimento = String(entrega.alimento || "").toLowerCase();

                if (alimento.includes("leche")) totalLeche++;
                else if (alimento.includes("almuerzo")) totalAlmuerzos++;
                else otrosAlimentos++;
            });

            if (typeof Chart === "undefined") {
                throw new Error("No se pudo cargar Chart.js para mostrar las gráficas.");
            }

            const opcionesComunes = {
                responsive: true,
                maintainAspectRatio: false
            };

            window.biopaeCharts.push(new Chart(
                tarjeta.querySelector("#graficaHistorial"),
                {
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
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } }
                        }
                    }
                }
            ));

            window.biopaeCharts.push(new Chart(
                tarjeta.querySelector("#graficaAlimentos"),
                {
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
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } }
                        }
                    }
                }
            ));

            const etiquetasDistribucion = ["Vasos de leche", "Almuerzos"];
            const valoresDistribucion = [totalLeche, totalAlmuerzos];

            if (otrosAlimentos > 0) {
                etiquetasDistribucion.push("Otros alimentos");
                valoresDistribucion.push(otrosAlimentos);
            }

            window.biopaeCharts.push(new Chart(
                tarjeta.querySelector("#graficaDistribucion"),
                {
                    type: "doughnut",
                    data: {
                        labels: etiquetasDistribucion,
                        datasets: [{
                            data: valoresDistribucion,
                            backgroundColor: ["#1F5D50", "#E3A008", "#86B7A5"],
                            borderWidth: 2,
                            borderColor: "#FFFFFF"
                        }]
                    },
                    options: {
                        ...opcionesComunes,
                        cutout: "65%",
                        plugins: { legend: { position: "bottom" } }
                    }
                }
            ));
        } catch (error) {
            console.error("BIOPAE: error cargando panel general:", error);

            if (tarjeta.isConnected) {
                const aviso = document.createElement("p");
                aviso.className = "error-box";
                aviso.textContent = error.message ||
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
            const datos = await obtenerJSON("/api/admin/estudiantes", "estudiantes");
            if (!tarjeta.isConnected) return;

            estado.textContent = `Total de estudiantes: ${datos.total}`;

            if (datos.estudiantes.length === 0) {
                tablaContenedor.textContent = "No hay estudiantes registrados.";
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

            tablaContenedor.replaceChildren(crearTabla(
                ["Documento", "Nombre", "Apellido", "Grupo", "Beneficio", "Estado"],
                filas
            ));
        } catch (error) {
            console.error("BIOPAE: error cargando estudiantes:", error);
            if (tarjeta.isConnected) {
                estado.textContent = error.message ||
                    "No se pudieron cargar los estudiantes.";
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
            const datos = await obtenerJSON("/api/admin/entregas", "entregas");
            if (!tarjeta.isConnected) return;

            estado.textContent = `Total de entregas: ${datos.total}`;

            if (datos.entregas.length === 0) {
                tablaContenedor.textContent = "No hay entregas registradas.";
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

            tablaContenedor.replaceChildren(crearTabla(
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
            ));
        } catch (error) {
            console.error("BIOPAE: error cargando historial:", error);
            if (tarjeta.isConnected) {
                estado.textContent = error.message ||
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
                    <input id="reclamos-busqueda" type="search"
                           placeholder="🔎 Buscar por nombre...">
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
        const totalConfirmadas = panel.querySelector("#total-reclamaron");

        const hoy = new Date();
        fechaInput.value = [
            hoy.getFullYear(),
            String(hoy.getMonth() + 1).padStart(2, "0"),
            String(hoy.getDate()).padStart(2, "0")
        ].join("-");

        let estudiantes = [];
        let entregas = [];

        const normalizar = valor => String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

        function celda(fila, valor) {
            const td = document.createElement("td");
            td.textContent =
                valor === null || valor === undefined || valor === ""
                    ? "—"
                    : String(valor);
            fila.appendChild(td);
        }

        function actualizarTabla() {
            if (!panel.isConnected) return;

            const fechaSeleccionada = fechaInput.value;
            const programaSeleccionado = programaInput.value;
            const busqueda = normalizar(busquedaInput.value);

            const entregasDia = entregas.filter(entrega => {
                if (entrega.fecha !== fechaSeleccionada) return false;
                if (normalizar(entrega.estado) !== "entregado") return false;

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
                    const registros = entregasPorDocumento.get(documento) || [];

                    if (programaSeleccionado === "todos") {
                        if (registros.length) {
                            registros.forEach(entrega => {
                                filas.push({ estudiante, entrega, reclamo: true });
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
                        filas.push({ estudiante, entrega, reclamo: true });
                    });
                });

            cuerpo.replaceChildren();

            filas.forEach(({ estudiante, entrega, reclamo }) => {
                const fila = document.createElement("tr");

                celda(fila, fechaSeleccionada);
                celda(
                    fila,
                    `${estudiante.nombre ?? ""} ${estudiante.apellido ?? ""}`.trim()
                );
                celda(fila, estudiante.grupo);
                celda(fila, entrega?.alimento ?? "Sin entrega registrada");
                celda(fila, reclamo ? "Sí reclamó" : "Sin registro");
                celda(fila, "—");

                cuerpo.appendChild(fila);
            });

            totalConfirmadas.textContent = entregasDia.length;

            panel.querySelector("#total-no-reclamaron").textContent =
                "No disponible";

            panel.querySelector("#total-redistribuidos").textContent =
                "No disponible";

            estado.textContent = filas.length
                ? `${filas.length} registros mostrados para ${fechaSeleccionada}.`
                : "No hay registros que coincidan con la fecha y los filtros.";

            if (programaSeleccionado !== "todos") {
                estado.textContent +=
                    " Se muestran entregas confirmadas del programa; " +
                    "la API actual no permite identificar quién era elegible y no reclamó.";
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
            console.error("BIOPAE: error cargando Control diario:", error);
            estado.textContent =
                error.message || "No fue posible cargar los datos de Neon.";
        }

        fechaInput.addEventListener("change", actualizarTabla);
        programaInput.addEventListener("change", actualizarTabla);
        busquedaInput.addEventListener("input", actualizarTabla);
    }

    /* ==================== CASOS EN REVISIÓN ==================== */

    async function mostrarCasosRevision() {
        mostrarEncabezado(
            "Casos en revisión",
            "Entregas con estados pendientes o con observaciones registradas."
        );

        const tarjeta = document.createElement("div");
        tarjeta.className = "admin-panel-card";

        const estado = document.createElement("p");
        estado.textContent = "Consultando casos en Neon...";

        const tablaContenedor = document.createElement("div");
        tablaContenedor.style.overflowX = "auto";

        tarjeta.append(estado, tablaContenedor);
        contenido.appendChild(tarjeta);

        try {
            const datos = await obtenerJSON("/api/admin/casos-revision", "casos");
            if (!tarjeta.isConnected) return;

            if (datos.casos.length === 0) {
                estado.textContent =
                    "No hay casos en revisión registrados actualmente.";
                return;
            }

            estado.textContent = `Total de casos encontrados: ${datos.total}`;

            const filas = datos.casos.map(caso => [
                caso.fecha,
                caso.hora,
                caso.documento,
                `${caso.nombre || ""} ${caso.apellido || ""}`.trim(),
                caso.alimento,
                caso.tipo_entrega,
                caso.estado,
                caso.observacion
            ]);

            tablaContenedor.replaceChildren(crearTabla(
                [
                    "Fecha",
                    "Hora",
                    "Documento",
                    "Estudiante",
                    "Alimento",
                    "Tipo de entrega",
                    "Estado",
                    "Observación"
                ],
                filas
            ));
        } catch (error) {
            console.error("BIOPAE: error cargando casos en revisión:", error);

            if (tarjeta.isConnected) {
                estado.textContent = error.message ||
                    "No fue posible cargar los casos en revisión.";
            }
        }
    }

    /* ==================== REPORTES ==================== */

    async function mostrarReportes() {
        mostrarEncabezado(
            "Reportes",
            "Resumen de las entregas registradas en BIOPAE."
        );

        const tarjeta = document.createElement("div");
        tarjeta.className = "admin-panel-card";
        tarjeta.textContent = "Cargando reportes desde Neon...";
        contenido.appendChild(tarjeta);

        try {
            const datos = await obtenerJSON("/api/admin/entregas", "entregas");
            const entregas = datos.entregas;

            const normalizar = texto => String(texto || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            const leche = entregas.filter(e =>
                normalizar(e.alimento).includes("leche")
            ).length;

            const almuerzos = entregas.filter(e =>
                normalizar(e.alimento).includes("almuerzo")
            ).length;

            const entregadas = entregas.filter(e =>
                normalizar(e.estado) === "entregado"
            ).length;

            const pendientes = entregas.length - entregadas;

            tarjeta.replaceChildren();

            const titulo = document.createElement("h2");
            titulo.textContent = "Resumen general";
            tarjeta.appendChild(titulo);

            const tabla = document.createElement("table");
            tabla.className = "admin-table";

            const cuerpo = document.createElement("tbody");

            [
                ["Total de entregas registradas", entregas.length],
                ["Vasos de leche", leche],
                ["Almuerzos", almuerzos],
                ["Entregas completadas", entregadas],
                ["Entregas con otro estado", pendientes]
            ].forEach(([nombre, cantidad]) => {
                const fila = document.createElement("tr");
                const celdaNombre = document.createElement("td");
                const celdaCantidad = document.createElement("td");

                celdaNombre.textContent = nombre;
                celdaCantidad.textContent = cantidad;

                fila.append(celdaNombre, celdaCantidad);
                cuerpo.appendChild(fila);
            });

            tabla.appendChild(cuerpo);
            tarjeta.appendChild(tabla);

            const subtitulo = document.createElement("h2");
            subtitulo.textContent = "Entregas por fecha";
            subtitulo.style.marginTop = "24px";
            tarjeta.appendChild(subtitulo);

            const porFecha = {};

            entregas.forEach(entrega => {
                const fechaEntrega = entrega.fecha || "Sin fecha";

                if (!porFecha[fechaEntrega]) {
                    porFecha[fechaEntrega] = {
                        leche: 0,
                        almuerzos: 0,
                        total: 0
                    };
                }

                porFecha[fechaEntrega].total++;

                if (normalizar(entrega.alimento).includes("leche")) {
                    porFecha[fechaEntrega].leche++;
                } else if (normalizar(entrega.alimento).includes("almuerzo")) {
                    porFecha[fechaEntrega].almuerzos++;
                }
            });

            const tablaFechas = document.createElement("table");
            tablaFechas.className = "admin-table";

            const encabezado = document.createElement("thead");
            const filaEncabezado = document.createElement("tr");

            ["Fecha", "Vasos de leche", "Almuerzos", "Total"].forEach(texto => {
                const th = document.createElement("th");
                th.textContent = texto;
                filaEncabezado.appendChild(th);
            });

            encabezado.appendChild(filaEncabezado);
            tablaFechas.appendChild(encabezado);

            const cuerpoFechas = document.createElement("tbody");

            Object.entries(porFecha)
                .sort(([fechaA], [fechaB]) => fechaB.localeCompare(fechaA))
                .forEach(([fechaEntrega, cantidades]) => {
                    const fila = document.createElement("tr");

                    [
                        fechaEntrega,
                        cantidades.leche,
                        cantidades.almuerzos,
                        cantidades.total
                    ].forEach(valor => {
                        const celda = document.createElement("td");
                        celda.textContent = valor;
                        fila.appendChild(celda);
                    });

                    cuerpoFechas.appendChild(fila);
                });

            tablaFechas.appendChild(cuerpoFechas);
            tarjeta.appendChild(tablaFechas);

            if (entregas.length === 0) {
                const mensaje = document.createElement("p");
                mensaje.textContent = "Todavía no hay entregas registradas en Neon.";
                tarjeta.appendChild(mensaje);
            }
        } catch (error) {
            console.error("Error cargando reportes:", error);
            tarjeta.textContent =
                "No fue posible cargar los reportes. Verifica tu sesión e inténtalo de nuevo.";
        }
    }

    /* ==================== NAVEGACIÓN ==================== */

    const secciones = {
        dashboard: mostrarPanelGeneral,
        estudiantes: mostrarEstudiantes,
        historial: mostrarHistorial,
        control: mostrarControlDiario,
        casos: mostrarCasosRevision,
        reportes: mostrarReportes
    };

    menu.addEventListener("click", event => {
        const boton = event.target.closest("[data-page]");
        if (!boton) return;

        const cargarSeccion = secciones[boton.dataset.page];
        if (!cargarSeccion) return;

        menu.querySelectorAll("[data-page]").forEach(elemento => {
            elemento.classList.toggle("active", elemento === boton);
        });

        cargarSeccion();
    });

    /* ==================== INICIALIZACIÓN ==================== */

    mostrarPanelGeneral();

    console.log("BIOPAE: panel iniciado correctamente.");
});
