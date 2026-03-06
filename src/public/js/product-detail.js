

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("add-to-cart-form");
    
    // 1. CORRECCIÓN: Quitamos el "!" para que entre cuando SÍ existe el form
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Leemos los IDs y cantidades
            const productId = Number(document.getElementById("detail-product-id").value);
            const quantity = Number(document.getElementById("detail-quantity").value);

            // 2. CORRECCIÓN: Agregamos la 'r' en getAttribute
            const name = form.getAttribute("data-name");
            const price = Number(form.getAttribute("data-price"));
            const image_url = form.getAttribute("data-img");

            if (!isLogged()) {
                const productData = { productId, name, price, image_url };
                addToGuestCart(productData, quantity, () => {
                    if (typeof refreshCartBadge === 'function') refreshCartBadge();
                    // 3. CORRECCIÓN: Cerramos el paréntesis del alert
                    alert("Agregado al carrito (invitado)");
                });
            } else {
                try {
                    // Obtenemos el estado actual para sumar a lo que ya existe
                    const res = await fetchUserCartAPI();
                    const items = res.data || res.items || (Array.isArray(res) ? res : []);
                    const existing = items.find(i => i.productId === productId);
                    const currentQty = existing ? existing.quantity : 0;
                    
                    const ok = await setUserCartQuantityAPI(productId, currentQty + quantity);
                    if (ok) {
                        if (typeof refreshCartBadge === 'function') refreshCartBadge();
                        alert("Carrito actualizado");
                    }
                } catch (err) {
                    console.error("Error al agregar:", err);
                }
            }
        });
    }
});