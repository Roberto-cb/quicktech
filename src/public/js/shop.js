/* ============================================
   1. ESTADO DE SESIÓN
   ============================================ */

function isLogged() {
  return document.body.getAttribute("data-logged") === "1";
}

function isAdmin(){
  return document.body.getAttribute("data-role") === "admin";
}

/* ============================================
   2. CARRITO GUEST (LocalStorage) 
   -> Movido a shop-cart.js
   ============================================ */

/* ============================================
   3. CARRITO LOGUEADO (API /cart)
   -> Funciones movidas a shop-api.js
   ============================================ */

// Mantenemos el Mapa para sincronizar cantidades en la UI
let userCartMap = new Map();

/* ============================================
   3.1 BADGE DEL NAVBAR
   ============================================ */

async function refreshCartBadge() {
  const badge = document.getElementById("cart-count");
  if(!badge) return;

  if(!isLogged()){
    const count = guestCartCount(); // De shop-cart.js
    badge.textContent = count;
    badge.hidden = count === 0;
    return;
  }

  try {
    // Usamos la función de shop-api.js
    const items = await fetchUserCartAPI(); 
    if(!items) return;

    const count = items.reduce((acc, it) => acc + (it.quantity || 0), 0);
    userCartMap = new Map(items.map((i) => [String(i.productId), i.quantity]));
    
    badge.textContent = count;
    badge.hidden = count === 0;
  } catch(err) {
    console.error("Error badge:", err);
    badge.hidden = true;
  }
}

/* ============================================
   4. RENDER DEL CATÁLOGO
   ============================================ */

const grid = document.getElementById("products-grid");
const adminCreatBtn = document.getElementById("admin-creat-product");

// Función "Puente" para actualizaciones visuales
async function handleCartUpdateUI() {
  await refreshCartBadge();
  await syncQuantities();
  
  if (typeof modal !== 'undefined' && !modal.hidden) {
    if (!isLogged()) {
      renderGuestCart();
    } else {
      await renderUserCart();
    }
  }
}

function formatPrice(price) {
  return `$${Number(price).toLocaleString("es-AR")}`;
}

function productCard(product) {
  const img = product.image_url || "";
  const href = `/product/${product.id}`;
  const inactiveClass = !product.isActive ? "card-inactive" : "";
  const inactiveBadge = !product.isActive ? `<span class="badge badge-inactive">Inactivo</span>` : "";

  const adminActions = isAdmin() ? `
    <div class="admin-card-actions">
      <button type="button" class="btn btn-ghost" data-admin-edit="${product.id}">Editar</button>
      ${product.isActive 
        ? `<button type="button" class="btn btn-danger" data-admin-toggle="${product.id}" data-next="0">Desactivar</button>`
        : `<button type="button" class="btn btn-primary" data-admin-toggle="${product.id}" data-next="1">Activar</button>`
      }
    </div>` : "";

  return `
    <article class="card ${inactiveClass}" data-product data-id="${product.id}" data-price="${Number(product.price)}">
      ${inactiveBadge}
      <a class="card-link" href="${href}">
        <div class="img-wrap"><img class="product-img" src="${img}" alt="${product.brand}" loading="lazy"/></div>
        <h3>${product.brand} - ${product.model}</h3>
      </a>
      <p>${product.category}</p>
      <p><strong>${formatPrice(product.price)}</strong></p>
      ${adminActions}
      ${product.isActive ? `
        <div class="qty-controls">
          <button type="button" data-action="dec">−</button>
          <span data-qty>0</span>
          <button type="button" data-action="inc">+</button>
        </div>` : `<p class="inactive-text">Producto desactivado</p>`}
    </article>
  `;
}

/* ============================================
   5. CARGAR PRODUCTOS (Conexión API)
   ============================================ */

async function loadProducts() {
  if (!grid) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") || "").trim();

    // Llamada a shop-api.js
    const products = await fetchProductsAPI(isAdmin(), q);
    if (products === null) return;

    if (!products.length) {
      grid.innerHTML = q ? `<p>No se encontró: <strong>${q}</strong></p>` : "<p>No hay productos.</p>";
      return;
    }

    grid.innerHTML = products.map(productCard).join("");
    syncQuantities();
  } catch (err) {
    grid.innerHTML = "<p>Error al cargar catálogo.</p>";
  }
}

/* ============================================
   6. SINCRONIZAR CANTIDADES
   ============================================ */

async function syncQuantities() {
  let map;
  if(!isLogged()){
    const cart = getGuestCart();
    map = new Map(cart.map((i) => [String(i.productId), i.quantity]));
  } else {
    map = userCartMap;
  }

  document.querySelectorAll("[data-product]").forEach((card) => {
    const id = card.getAttribute("data-id");
    const qty = map.get(id) || 0;
    const qtyEl = card.querySelector("[data-qty]");
    if (qtyEl) qtyEl.textContent = qty;
  });
}

/* ============================================
   7. EVENTOS DEL CATÁLOGO
   ============================================ */

function attachCatalogEvents() {
  if (!grid) return;

  grid.addEventListener("click", async (e) => {
    // ADMIN: EDITAR (Usa shop-admin.js)
    const editBtn = e.target.closest("[data-admin-edit]");
    if(editBtn && isAdmin()){
      const id = Number(editBtn.getAttribute("data-admin-edit"));
      const product = await fetchProductsAPI(true, "", id); // shop-api.js
      adminEditingId = id; 
      fillAdminForm(product); 
      openAdminModal("edit");
      return;
    }

    // BOTONES + / -
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const card = btn.closest("[data-product]");
    const productId = Number(card.getAttribute("data-id"));
    const delta = btn.getAttribute("data-action") === "inc" ? 1 : -1;

    if(!isLogged()){
      const product = {
        productId,
        name: card.querySelector("h3").textContent?.trim(),
        price: Number(card.getAttribute("data-price")),
        image_url: card.querySelector("img")?.src
      };
      addToGuestCart(product, delta, handleCartUpdateUI);
    } else {
      const currentQty = userCartMap.get(String(productId)) || 0;
      const nextQty = Math.max(0, currentQty + delta);
      const ok = await setUserCartQuantityAPI(productId, nextQty);
      if(ok) handleCartUpdateUI();
    }
  });
}

/* ============================================
   9. MODAL CARRITO & RENDER
   ============================================ */

const modal = document.querySelector("#guest-cart-modal");
const modalItems = document.querySelector("#guest-cart-items");
const modalTotal = document.querySelector("#guest-cart-total");

function renderGuestCart() {
  if (!modalItems || !modalTotal) return;
  const items = getGuestCart();
  if (!items.length) {
    modalItems.innerHTML = "<p>Carrito vacío.</p>";
    modalTotal.textContent = formatPrice(0);
    return;
  }
  modalItems.innerHTML = items.map(i => `
    <div class="cart-item" data-id="${i.productId}">
      <img class="cart-item__img" src="${i.image_url || ''}" />
      <div class="cart-item__info"><div>${i.name}</div><div>${formatPrice(i.price)}</div></div>
      <div class="cart-item__actions">
        <button data-cart-inc>+</button><span>${i.quantity}</span><button data-cart-dec>−</button>
        <button data-cart-remove>✕</button>
      </div>
    </div>`).join("");
  modalTotal.textContent = formatPrice(guestCartTotal());
}

async function renderUserCart(){
  if(!modalItems || !modalTotal) return;
  const items = await fetchUserCartAPI();
  if(!items || !items.length){
    modalItems.innerHTML = "<p>Carrito vacío.</p>";
    modalTotal.textContent = formatPrice(0);
    return;
  }
  modalItems.innerHTML = items.map(i => `...mismo template...`).join(""); // (Template abreviado para brevedad)
  modalTotal.textContent = formatPrice(items.reduce((acc, x) => acc + x.lineTotal, 0));
}

async function openCart() {
  !isLogged() ? renderGuestCart() : await renderUserCart();
  if (modal) modal.hidden = false;
}

/* ============================================
   10. EVENTOS NAVBAR & MODAL
   ============================================ */

document.addEventListener("click", async (e) => {
  if (e.target.closest("#navbar-cart-link")) { e.preventDefault(); await openCart(); }
  if (e.target.closest("#guest-cart-close")) modal.hidden = true;
  
  // Lógica de botones internos del modal simplificada con handleCartUpdateUI...
});

/* ============================================
   8. INIT (PUNTO 3: CONEXIÓN ADMIN)
   ============================================ */

document.addEventListener("DOMContentLoaded", async () => {
  await mergeGuestCartIfLogged(); // shop-cart.js llamando a shop-api.js
  await refreshCartBadge();
   
  if (grid) {
    await loadProducts();
    attachCatalogEvents();
  }

  // CONFIGURACIÓN PUNTO 3: Conexión con shop-admin.js
  const adminForm = document.getElementById("admin-product-form");
  if(adminForm) {
    adminForm.addEventListener("submit", (e) => {
      adminSaveProduct(e, async () => {
        await loadProducts();
        await handleCartUpdateUI();
      });
    });
  }

  initAdminExcelImport(async () => {
    await loadProducts();
    await handleCartUpdateUI();
  });
});