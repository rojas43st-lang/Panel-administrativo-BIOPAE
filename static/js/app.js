
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

    document.getElementById("sidebar-usuario").textContent =
        sesion.usuario || "Administrador";

    document.getElementById("sidebar-rol").textContent =
        sesion.rol || "Coordinador";

    const fecha = document.getElementById("topbar-fecha");

    if (fecha) {
        fecha.textContent = new Intl.DateTimeFormat("es-CO", {
            dateStyle: "full"
        }).format(new Date());
    }

    function mostrarEncabezado(titulo, descripcion) {
        contenido.innerHTML = `
            <div class="page-header">
                <h1>${titulo}</h1>
                <p>${descripcion}</p>
            </div>
        `;
    }

    function mostrarPanelGeneral() {
        mostrarEncabezado(
            "Panel general",
            "Panel administrativo del Programa de Alimentación Escolar."
        );

        contenido.insertAdjacentHTML("beforeend", `
            <div class="admin-panel-card">
                <h2>Bienvenido a BIOPAE</h2>
                <p>Selecciona una sección del menú para consultar la información.</p>
            </div>
        `);
    }

    async function mostrarEstudiantes() {
        mostrarEncabezado(
            "Estudiantes",
            "Listado de estudiantes consultado directamente desde Neon."
        );

        contenido.insertAdjacentHTML("beforeend", `
            <div class="admin-panel-card">
                <p id="estudiantes-estado">Cargando estudiantes...</p>
                <div id="estudiantes-tabla"></div>
            </div>
        `);

        const estado = document.getElementById("estudiantes-estado");
        const tabla = document.getElementById("estudiantes-tabla");

        try {
            const respuesta = await fetch("/api/admin/estudiantes", {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (respuesta.status === 401) {
                estado.textContent =
                    "Tu sesión no está activa. Inicia sesión nuevamente.";
                return;
            }

            if (!respuesta.ok) {
                throw new Error(`Error HTTP ${respuesta.status}`);
            }

            const datos = await respuesta.json();

            if (!datos.ok || !Array.isArray(datos.estudiantes)) {
                throw new Error("La respuesta de la API no tiene el formato esperado.");
            }

            estado.textContent = `Total de estudiantes: ${datos.total}`;

            if (datos.estudiantes.length === 0) {
                tabla.textContent = "No hay estudiantes registrados.";
                return;
            }

            const tablaHTML = document.createElement("table");
            tablaHTML.className = "admin-table";

            const thead = document.createElement("thead");
            const filaCabecera = document.createElement("tr");
["Documento", "Nombre", "Apellido", "Grupo", "Beneficio", "Estado"].forEach(texto => {
                const th = document.createElement("th");
                th.textContent = texto;
                filaCabecera.appendChild(th);
            });

            thead.appendChild(filaCabecera);
            tablaHTML.appendChild(thead);

            const tbody = document.createElement("tbody");

            datos.estudiantes.forEach(estudiante => {
                const fila = document.createElement("tr");

                const valores = [
                    estudiante.documento,
                    estudiante.nombre,
                    estudiante.apellido,
                    estudiante.grupo,
                    estudiante.activo ? "Activo" : "Inactivo"
                ];

                valores.forEach(valor => {
                    const td = document.createElement("td");
                    td.textContent = valor ?? "—";
                    fila.appendChild(td);
                });

                tbody.appendChild(fila);
            });

            tablaHTML.appendChild(tbody);
            tabla.replaceChildren(tablaHTML);

        } catch (error) {
            console.error("BIOPAE: error cargando estudiantes:", error);
            estado.textContent =
                "No se pudieron cargar los estudiantes. Recarga la página e inténtalo de nuevo.";
        }
    }

    const secciones = {
        dashboard: mostrarPanelGeneral,
        estudiantes: mostrarEstudiantes,
        historial: () => mostrarEncabezado(
            "Historial de entregas",
            "Esta sección se conectará con los registros reales de entregas."
        ),
        control: () => mostrarEncabezado(
            "Control diario",
            "Esta sección se conectará con los cupos y entregas del día."
        ),
        casos: () => mostrarEncabezado(
            "Casos en revisión",
            "Esta sección se conectará con los registros correspondientes."
        ),
        reportes: () => mostrarEncabezado(
            "Reportes",
            "Esta sección se conectará con los datos reales de BIOPAE."
        )
    };

    menu.addEventListener("click", event => {
        const boton = event.target.closest("[data-page]");

        if (!boton) return;

        const pagina = boton.dataset.page;
        const cargarSeccion = secciones[pagina];

        if (!cargarSeccion) return;

        menu.querySelectorAll("[data-page]").forEach(elemento => {
            elemento.classList.toggle("active", elemento === boton);
        });

        cargarSeccion();
    });

    mostrarPanelGeneral();

    console.log("BIOPAE: panel iniciado correctamente.");
});
