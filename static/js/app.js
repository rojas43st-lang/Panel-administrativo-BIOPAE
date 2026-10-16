
/* ==================== ESTUDIANTES DESDE NEON ==================== */

function renderEstudiantes(soloLectura) {
  const wrap = el(`
    <div>
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

      <p id="est-mensaje" class="muted"></p>

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
                <td colspan="5" style="text-align:center;padding:24px">
                  Cargando estudiantes desde Neon...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `);

  const busqueda = wrap.querySelector("#est-busqueda");
  const filtroGrupo = wrap.querySelector("#est-grupo");
  const contador = wrap.querySelector("#est-contador");
  const mensaje = wrap.querySelector("#est-mensaje");
  const tbody = wrap.querySelector("#est-tbody");

  let estudiantes = [];

  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[caracter]);
  }

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
        String(estudiante.grupo || "") === grupoSeleccionado;

      return coincideBusqueda && coincideGrupo;
    });

    contador.textContent = `${filtrados.length} resultados`;

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:24px">
            No se encontraron estudiantes.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtrados.map(estudiante => {
      const nombre =
        `${estudiante.nombre || ""} ${estudiante.apellido || ""}`.trim();

      const estado = estudiante.activo ? "Activo" : "Inactivo";
      const claseEstado = estudiante.activo
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

  fetch("/api/admin/estudiantes", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      "Accept": "application/json"
    }
  })
    .then(async respuesta => {
      if (respuesta.status === 401) {
        throw new Error("Tu sesión venció. Inicia sesión nuevamente.");
      }

      if (!respuesta.ok) {
        throw new Error(`Error del servidor: ${respuesta.status}`);
      }

      return respuesta.json();
    })
    .then(datos => {
      if (!datos.ok || !Array.isArray(datos.estudiantes)) {
        throw new Error("La respuesta de Neon no es válida.");
      }

      estudiantes = datos.estudiantes;

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
          <td colspan="5" style="text-align:center;padding:24px">
            No se pudieron cargar los estudiantes.
          </td>
        </tr>
      `;
    });

  return wrap;
}
