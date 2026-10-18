
document.addEventListener("DOMContentLoaded", () => {
    const login = document.getElementById("view-login");
    const app = document.getElementById("view-app");
    const contenido = document.getElementById("page-content");

    if (!login || !app || !contenido) {
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

    contenido.innerHTML = `
        <div class="page-header">
            <h1>Panel general</h1>
            <p>La sesión funciona y el JavaScript se está ejecutando.</p>
        </div>
        <div class="admin-panel-card">
            <p>Prueba de conexión del panel completada.</p>
        </div>
    `;

    document.getElementById("nav-menu")
        ?.addEventListener("click", (event) => {
            const boton = event.target.closest("[data-page]");
            if (boton) {
                contenido.innerHTML = `
                    <div class="page-header">
                        <h1>${boton.textContent.trim()}</h1>
                        <p>Sección detectada correctamente.</p>
                    </div>
                `;
            }
        });

    console.log("BIOPAE: sesión detectada y panel iniciado.");
});
