
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

    if (usuario) {
        usuario.textContent = sesion.usuario || "Administrador";
    }

    if (rol) {
        rol.textContent = sesion.rol || "Coordinador";
    }

    const fecha = document.getElementById("topbar-fecha");

    if (fecha) {
        fecha.textContent = new Intl.DateTimeFormat("es-CO", {
            dateStyle: "full"
        }).format(new Date());
    }

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

            valores.forEach(valor => {
                crearCelda(fila, valor);
            });

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
                "Accept": "application/json"
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
            "Resumen de los datos reales del Programa de Alimentación Escolar."
        );

        const tarjeta = document.createElement("div");
        tarjeta.className = "admin-panel-card";
        tarjeta.textContent = "Cargando estadísticas...";

        contenido.appendChild(tarjeta);

        try {
            const respuesta = await fetch("/api/admin/estadisticas", {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (respuesta.status === 401) {
                throw new Error(
                    "Tu sesión ha expirado. Inicia sesión nuevamente."
                );
            }

            if (!respuesta.ok) {
                throw new Error(`Error HTTP ${respuesta.status}`);
            }

            const datos = await respuesta.json();

            if (!datos.ok) {
                throw new Error(
                    "No se pudieron consultar las estadísticas."
                );
            }

            if (!tarjeta.isConnected) return;

            const estadisticas = [
                {
                    titulo: "Estudiantes activos",
                    valor: datos.estudiantes_activos
                },
                {
                    titulo: "Entregas registradas",
                    valor: datos.entregas_hoy
                },
                {
                    titulo: "Vasos de leche",
                    valor: datos.vasos_leche
                },
                {
                    titulo: "Almuerzos",
                    valor: datos.almuerzos
                },
                {
                    titulo: "Cupos disponibles",
                    valor: datos.cupos_disponibles
                },
                {
                    titulo: "Cupos entregados",
                    valor: datos.cupos_entregados
                }
            ];

            tarjeta.replaceChildren();

            const contenedor = document.createElement("div");
            contenedor.className = "estadisticas-grid";

            estadisticas.forEach(item => {
                const elemento = document.createElement("div");
                elemento.className = "admin-panel-card";

                const titulo = document.createElement("h3");
                titulo.textContent = item.titulo;

                const valor = document.createElement("p");
                valor.className = "estadistica-valor";
                valor.textContent = item.valor ?? 0;

                elemento.append(titulo, valor);
                contenedor.appendChild(elemento);
            });

            tarjeta.appendChild(contenedor);

        } catch (error) {
            console.error(
                "BIOPAE: error cargando estadísticas:",
                error
            );

            if (tarjeta.isConnected) {
                tarjeta.textContent =
                    error.message ||
                    "No fue posible cargar las estadísticas.";
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

            estado.textContent =
                `Total de estudiantes: ${datos.total}`;

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
            console.error(
                "BIOPAE: error cargando estudiantes:",
                error
            );

            if (tarjeta.isConnected) {
                estado.textContent =
                    error.message ||
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
            const datos = await obtenerJSON(
                "/api/admin/entregas",
                "entregas"
            );

            if (!tarjeta.isConnected) return;

            estado.textContent =
                `Total de entregas: ${datos.total}`;

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
            console.error(
                "BIOPAE: error cargando historial:",
                error
            );

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
            "Control diario",
            "Consulta los cupos registrados de vasos de leche y almuerzos."
        );

        const tarjeta = document.createElement("div");
        tarjeta.className = "admin-panel-card";

        const estado = document.createElement("p");
        estado.textContent = "Cargando datos de Neon...";

        const tablaContenedor = document.createElement("div");
        tablaContenedor.style.overflowX = "auto";

        tarjeta.append(estado, tablaContenedor);
        contenido.appendChild(tarjeta);

        try {
            const datos = await obtenerJSON(
                "/api/admin/control-diario",
                "cupos"
            );

            if (!tarjeta.isConnected) return;

            const cupos = datos.cupos;

            if (cupos.length === 0) {
                estado.textContent =
                    "No hay cupos diarios registrados.";
                return;
            }

            estado.textContent =
                `${cupos.length} registros encontrados en Neon.`;

            const filas = cupos.map(cupo => [
                cupo.fecha,
                cupo.alimento,
                cupo.cantidad_disponible,
                cupo.cantidad_entregada
            ]);

            tablaContenedor.replaceChildren(
                crearTabla(
                    [
                        "Fecha",
                        "Alimento",
                        "Cupos disponibles",
                        "Cupos entregados"
                    ],
                    filas
                )
            );

        } catch (error) {
            console.error(
                "BIOPAE: error cargando Control diario:",
                error
            );

            if (tarjeta.isConnected) {
                estado.textContent =
                    error.message ||
                    "No fue posible cargar el control diario.";
            }
        }
    }

    /* ==================== SECCIONES PENDIENTES ==================== */

    function mostrarPendiente(titulo, descripcion) {
        mostrarEncabezado(titulo, descripcion);

        const tarjeta = document.createElement("div");
        tarjeta.className = "admin-panel-card";

        const mensaje = document.createElement("p");
        mensaje.textContent =
            "Esta sección todavía no está conectada a los datos de Neon.";

        tarjeta.appendChild(mensaje);
        contenido.appendChild(tarjeta);
    }

    /* ==================== NAVEGACIÓN ==================== */

    const secciones = {
        dashboard: mostrarPanelGeneral,
        estudiantes: mostrarEstudiantes,
        historial: mostrarHistorial,
        control: mostrarControlDiario,

        casos: () => mostrarPendiente(
            "Casos en revisión",
            "Esta sección se conectará con los registros correspondientes."
        ),

        reportes: () => mostrarPendiente(
            "Reportes",
            "Esta sección se conectará con los datos reales de BIOPAE."
        )
    };

    menu.addEventListener("click", event => {
        const boton = event.target.closest("[data-page]");

        if (!boton) return;

        const cargarSeccion = secciones[boton.dataset.page];

        if (!cargarSeccion) return;

        menu.querySelectorAll("[data-page]").forEach(elemento => {
            elemento.classList.toggle(
                "active",
                elemento === boton
            );
        });

        cargarSeccion();
    });

    /* ==================== INICIALIZACIÓN ==================== */

    mostrarPanelGeneral();

    console.log("BIOPAE: panel iniciado correctamente.");
});
