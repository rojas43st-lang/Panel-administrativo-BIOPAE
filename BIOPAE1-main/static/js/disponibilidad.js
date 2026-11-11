document.addEventListener("DOMContentLoaded", async () => {
    const cantidad = document.getElementById("cantidad-alimento");
    const alimentoId = Number(cantidad?.dataset.alimentoId);

    if (!cantidad || ![1, 2].includes(alimentoId)) {
        return;
    }

    try {
        const respuesta = await fetch(`/api/alimentos/${alimentoId}`, {
            cache: "no-store"
        });
        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.ok) {
            throw new Error(datos.mensaje || "No fue posible consultar el alimento.");
        }

        const valor = document.createElement("span");
        valor.className = "cantidad-valor";
        valor.textContent = String(datos.cantidad);

        const etiqueta = document.createElement("span");
        etiqueta.className = "cantidad-etiqueta";
        etiqueta.textContent = `${datos.nombre} disponibles`;

        cantidad.replaceChildren(valor, etiqueta);
    } catch (error) {
        const mensaje = document.createElement("span");
        mensaje.className = "mensaje-error";
        mensaje.textContent = "No fue posible consultar la disponibilidad.";
        cantidad.replaceChildren(mensaje);
        console.error("Error consultando disponibilidad:", error);
    }
});
