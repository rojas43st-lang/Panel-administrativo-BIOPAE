
/* =========================================================
   BIOPAE — PANEL ADMINISTRATIVO
   Inicialización, navegación y conexión con Neon
   ========================================================= */

"use strict";

/* ==================== ELEMENTOS Y UTILIDADES ==================== */

function el(html) {
  const plantilla = document.createElement("template");
  plantilla.innerHTML = html.trim();
  return plantilla.content.firstElementChild;
}

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caracter]);
}

async function consultarEstudiantes() {
  const respuesta = await fetch("/api/admin/estudiantes", {
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
    throw new Error(`Error del servidor: ${respuesta.status}`);
  }

  const datos = await respuesta.json();

  if (!datos.ok || !Array.isArray(datos.estudiantes)) {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }

  return datos.estudiantes;
}

/* ==================== PANEL GENERAL ==================== */

function renderDashboard() {
  const wrap = el(`
    <section>
      <div class="page-header">
        <h1>Panel general</h1>
        <p>
          Resumen administrativo del Programa de Alimentación Escolar.
        </p>
      </div>

      <div class="dashboard-grid"
           style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px">

        <div class="card" style="padding:20px">
          <p class="muted">Estudiantes registrados</p>
          <h2 id="dash-estudiantes">Cargando...</h2>
          <p class="muted">Datos consultados desde Neon</p>
        </div>

        <div class="card" style="padding:20px">
          <p class="muted">Estudiantes activos</p>
          <h2 id="dash-activos">—</h2>
          <p class="muted">Según el estado registrado</p>
        </div>

        <div class="card" style="padding:20px">
          <p class="muted">Estudiantes inactivos</p>
          <h2 id="dash-inactivos">—</h2>
          <p class="muted">Según el estado registrado</p>
        </div>
      </div>

      <div class="card" style="padding:20px;margin-top:20px">
        <h2>Bienvenido a BIOPAE</h2>
        <p>
          Desde este panel puedes consultar los estudiantes y acceder
          a las demás secciones administrativas.
        </p>

        <button class="btn btn-primary"
                type="button"
                data-page="estudiantes">
          Consultar estudiantes
        </button>

        <p id="dash-mensaje" class="muted" role="status"></p>
      </div>
    </section>
  `);

  const total = wrap.querySelector("#dash-estudiantes");
  const activos = wrap.querySelector("#dash-activos");
  const inactivos = wrap.querySelector("#dash-inactivos");
  const mensaje = wrap.querySelector("#dash-mensaje");

  consultarEstudiantes()
    .then(estudiantes => {
      total.textContent = estudiantes.length;

      const cantidadActivos = estudiantes.filter(
        estudiante => estudiante.activo === true
      ).length;

      activos.textContent = cantidadActivos;
      inactivos.textContent = estudiantes.length - cantidadActivos;
    })
    .catch(error => {
      console.error("Error cargando el panel general:", error);

      total.textContent = "Error";
      activos.textContent = "—";
      inactivos.textContent = "—";
      mensaje.textContent = error.message;
    });

  return wrap;
}

/* ==================== ESTUDIANTES DESDE NEON ==================== */

function renderEstudiantes(soloLectura) {
  const wrap = el(`
    <section>
      <div class="page-header">
        <h1>Estudiantes</h1>
        <p>Listado real de estudiantes consultado desde Neon.</p>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <span>🔎</span>
          <input
            id="est-busqueda"
            type="search"
            placeholder="Buscar por nombre o documento..."
          />
        </div>

        <select id="est-grupo">
          <option value="todos">Todos los grupos</option>
        </select>

        <span class="badge badge-neutral" id="est-contador">
          Cargando...
        </span>
      </div>

      <p id="est-mensaje" class="muted" role="status"></p>

      <div class="card card-flush">
        <div class="table-wrap table-scroll">
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Grupo</th>
                <th>Programa</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody id="est-tbody">
              <tr>
                <td colspan="5"
                    style="text-align:center;padding:24px">
                  Cargando estudiantes desde Neon...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `);

  const busqueda = wrap.querySelector("#est-busqueda");
  const filtroGrupo = wrap.querySelector("#est-grupo");
  const contador = wrap.querySelector("#est-contador");
  const mensaje = wrap.querySelector("#est-mensaje");
  const tbody = wrap.querySelector("#est-tbody");

  let estudiantes = [];

  function pintarEstudiantes() {
    const texto = busqueda.value.trim().toLowerCase();
    const grupoSeleccionado = filtroGrupo.value;

    const filtrados = estudiantes.filter(estudiante => {
      const nombreCompleto =
        `${estudiante.nombre || ""} ${estudiante.apellido || ""}`.trim();

      const coincideBusqueda = [
        nombreCompleto,
        estudiante.documento,
        estudiante.grupo
      ].some(valor =>
        String(valor ?? "").toLowerCase().includes(texto)
      );

      const coincideGrupo =
        grupoSeleccionado === "todos" ||
        String(estudiante.grupo || "").trim() === grupoSeleccionado;

      return coincideBusqueda && coincideGrupo;
    });

    contador.textContent = `${filtrados.length} resultados`;

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5"
              style="text-align:center;padding:24px">
            No se encontraron estudiantes.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtrados.map(estudiante => {
      const nombre =
        `${estudiante.nombre || ""} ${estudiante.apellido || ""}`.trim();

      const estaActivo = estudiante.activo === true;
      const estado = estaActivo ? "Activo" : "Inactivo";
      const claseEstado = estaActivo
        ? "badge-activo"
        : "badge-suspendido";

      return `
        <tr data-id="${Number(estudiante.id) || 0}">
          <td>${escapar(estudiante.documento || "—")}</td>
          <td><b>${escapar(nombre || "Sin nombre")}</b></td>
          <td>${escapar(estudiante.grupo || "Sin grupo")}</td>
          <td>
            <span class="badge badge-neutral">Sin asignar</span>
          </td>
          <td>
            <span class="badge ${claseEstado}">${estado}</span>
          </td>
        </tr>
      `;
    }).join("");
  }

  busqueda.addEventListener("input", pintarEstudiantes);
  filtroGrupo.addEventListener("change", pintarEstudiantes);

  consultarEstudiantes()
    .then(datos => {
      estudiantes = datos;

      const grupos = [
        ...new Set(
          estudiantes
            .map(estudiante => String(estudiante.grupo || "").trim())
            .filter(Boolean)
        )
      ].sort((a, b) =>
        a.localeCompare(b, "es", { numeric: true })
      );

      grupos.forEach(grupo => {
        const opcion = document.createElement("option");
        opcion.value = grupo;
        opcion.textContent = grupo;
        filtroGrupo.appendChild(opcion);
      });

      mensaje.textContent =
        `${estudiantes.length} estudiantes cargados desde Neon.`;

      pintarEstudiantes();
    })
    .catch(error => {
      console.error("Error consultando estudiantes:", error);

      contador.textContent = "Error";
      mensaje.textContent = error.message;

      tbody.innerHTML = `
        <tr>
          <td colspan="5"
              style="text-align:center;padding:24px">
            No se pudieron cargar los estudiantes.
            Comprueba tu sesión y la conexión con Neon.
          </td>
        </tr>
      `;
    });

  return wrap;
}

/* ==================== SECCIONES PENDIENTES DE CONEXIÓN ==================== */

function renderSeccionPendiente(titulo, descripcion) {
  return el(`
    <section>
      <div class="page-header">
        <h1>${escapar(titulo)}</h1>
        <p>${escapar(descripcion)}</p>
      </div>

      <div class="card" style="padding:24px">
        <h2>Sección disponible</h2>
        <p>
          La navegación funciona, pero esta sección todavía necesita
          conectarse a sus consultas y tablas de la base de datos.
        </p>
      </div>
    </section>
  `);
}

/* ==================== NAVEGACIÓN ==================== */

const paginas = {
  dashboard: () => renderDashboard(),

  estudiantes: () => renderEstudiantes(true),

  historial: () => renderSeccionPendiente(
    "Historial de entregas",
    "Consulta de entregas de vasos de leche y almuerzos."
  ),

  control: () => renderSeccionPendiente(
    "Control diario",
    "Seguimiento diario de la entrega de alimentos."
  ),

  casos: () => renderSeccionPendiente(
    "Casos en revisión",
    "Revisión de novedades y registros pendientes."
  ),

  reportes: () => renderSeccionPendiente(
    "Reportes",
    "Resumen de información administrativa de BIOPAE."
  )
};

function mostrarPagina(nombre) {
  const contenido = document.getElementById("page-content");

  if (!contenido) {
    console.error("No se encontró el elemento #page-content.");
    return;
  }

  const crearPagina = paginas[nombre];

  if (!crearPagina) {
    console.error("Página desconocida:", nombre);
    return;
  }

  try {
    contenido.replaceChildren(crearPagina());

    document.querySelectorAll("#nav-menu [data-page]")
      .forEach(boton => {
        const activa = boton.dataset.page === nombre;

        boton.classList.toggle("active", activa);

        if (activa) {
          boton.setAttribute("aria-current", "page");
        } else {
          boton.removeAttribute("aria-current");
        }
      });
  } catch (error) {
    console.error("Error mostrando la página:", nombre, error);

    contenido.replaceChildren(
      el(`
        <div class="card" style="padding:24px">
          <h2>No se pudo mostrar esta sección</h2>
          <p>Recarga la página e inténtalo nuevamente.</p>
        </div>
      `)
    );
  }
}

/* ==================== INICIALIZACIÓN ==================== */

function iniciarBioPAE() {
  const vistaLogin = document.getElementById("view-login");
  const vistaApp = document.getElementById("view-app");
  const contenido = document.getElementById("page-content");

  if (!vistaLogin || !vistaApp || !contenido) {
    console.error(
      "No se encontraron los elementos principales de BIOPAE. " +
      "Comprueba templates/index.html."
    );
    return;
  }

  // El servidor establece ADMIN_SESSION cuando existe una sesión.
  const sesion = window.ADMIN_SESSION;

  if (!sesion || typeof sesion !== "object") {
    vistaLogin.classList.remove("hidden");
    vistaApp.classList.add("hidden");
    return;
  }

  vistaLogin.classList.add("hidden");
  vistaApp.classList.remove("hidden");

  const usuario = document.getElementById("sidebar-usuario");
  const rol = document.getElementById("sidebar-rol");

  if (usuario) {
    usuario.textContent = sesion.usuario || "Administrador";
  }

  if (rol) {
    rol.textContent = sesion.rol || "Administrador";
  }

  const fecha = document.getElementById("topbar-fecha");

  if (fecha) {
    fecha.textContent = new Intl.DateTimeFormat("es-CO", {
      dateStyle: "full"
    }).format(new Date());
  }

  const menu = document.getElementById("nav-menu");

  if (menu) {
    menu.addEventListener("click", evento => {
      const boton = evento.target.closest("button[data-page]");

      if (!boton || !menu.contains(boton)) {
        return;
      }

      mostrarPagina(boton.dataset.page);
    });
  }

  // Abre el panel general al iniciar sesión.
  mostrarPagina("dashboard");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarBioPAE);
} else {
  iniciarBioPAE();
}
