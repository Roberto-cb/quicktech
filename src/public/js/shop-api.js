/* ============================================================
   QT_SHOP_API.JS - Comunicación con el Servidor (Fetch)
   ============================================================ */

function isLogged() {
  return document.body.getAttribute("data-logged") === "1";
}

function isAdmin(){
  return document.body.getAttribute("data-role") === "admin";
}
// 1. Obtener el catálogo de productos
async function fetchProductsAPI(isAdminMode = false, query = "", id = null) {

    const baseUrl = isAdminMode ? "/products/admin" : "/products";

    let apiUrl;

    if(id){
        apiUrl = `${baseUrl}/${id}`;
    } else {
        apiUrl = query ? `${baseUrl}?q=${encodeURIComponent(query)}` : baseUrl;
    }

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

    return {
        data: json.data ?? json.items ?? json
    };
}

// 2. Obtener el carrito del usuario logueado
async function fetchUserCartAPI() {
    const res = await fetch("/cart", { 
    headers: { Accept: "application/json" },
    credentials: "include" 
    });
    
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
        credentials:"include",
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
    const res = await fetch(url, { 
        method: "DELETE",
        credentials: "include" 
    });
    
    if (res.status === 401) {
        window.location.href = "/auth/login?expired=true";
        return false;
    }
    return res.ok;
}

async function createProductAPI(payload) {
    const res = await fetch('/products', { 
        method: 'POST',
        headers: {"Content-Type" : "application/json"},
        credentials: "include",
        body: JSON.stringify(payload)
   });
   if(res.status === 401){ window.location.href = "/auth/login?expired=true"; return null;}
   if(!res.ok) throw new Error((await res.json()).error || "No se pudo crear el producto");  
   return true;
}

// 6. Actualizar producto
async function updateProductAPI(id, payload) {
    const res = await fetch(`/products/${id}`, {
        method: 'PUT',
        headers:{"Content-Type" : "application/json"},
        credentials: "include",
        body: JSON.stringify(payload) 
    });
    if(res.status === 401){ window.location.href = "/auth/login?expired=true"; return null;}
    if(!res.ok) throw new Error((await res.json()).error || "No se pudo actualizar el producto");  
    return true;
}

// 7. Importar Excel (Corregido el mensaje de error)
async function adminImportExcelAPI(file) {
    const formData = new FormData();
    formData.append("excel", file);

    const res = await fetch("/products/import-excel", {
      method: 'POST',
      credentials: "include",
      body: formData
    });

    if (res.status === 401) { window.location.href = "/auth/login?expired=true"; return null; }

    const data = await res.json().catch(() => ({}));
    if(!res.ok) throw new Error(data?.error || "Error importando el archivo Excel");  
    return data;
}