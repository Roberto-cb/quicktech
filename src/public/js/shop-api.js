/* ============================================================
   QT_SHOP_API.JS - Comunicación con el Servidor (Fetch)
   ============================================================ */

// 1. Obtener el catálogo de productos
async function fetchProductsAPI(isAdminMode = false, query = "") {
    const baseUrl = isAdminMode ? "/products/admin" : "/products";
    const apiUrl = query ? `${baseUrl}?q=${encodeURIComponent(query)}` : baseUrl;

    const res = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
        credentials: "include"
    });

    if (res.status === 401) {
        window.location.href = "/auth/login?expired=true";
        return null;
    }

    if (!res.ok) throw new Error("Error en la red al cargar productos");
    
    const json = await res.json();
    return json.data ?? json.items ?? json;
}

// 2. Obtener el carrito del usuario logueado
async function fetchUserCartAPI() {
    const res = await fetch("/cart", { headers: { Accept: "application/json" } });
    
    if (res.status === 401) {
        window.location.href = "/auth/login?expired=true";
        return null;
    }
    
    if (!res.ok) throw new Error("No se pudo obtener el carrito del servidor");
    
    const json = await res.json();
    return json.data ?? json.items ?? json;
}

// 3. Actualizar cantidad de un item en el servidor
async function setUserCartQuantityAPI(productId, quantity) {
    const res = await fetch("/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
    });

    if (res.status === 401) {
        window.location.href = "/auth/login?expired=true";
        return false;
    }
    return res.ok;
}

// 4. Eliminar item o vaciar carrito
async function deleteCartItemAPI(productId = null) {
    const url = productId ? `/cart/items/${productId}` : "/cart";
    const res = await fetch(url, { method: "DELETE" });
    
    if (res.status === 401) {
        window.location.href = "/auth/login?expired=true";
        return false;
    }
    return res.ok;
}