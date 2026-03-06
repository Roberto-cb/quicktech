
/*
function isLogged() {
  return document.body.getAttribute("data-logged") === "1";
}

function isAdmin(){
  return document.body.getAttribute("data-role") === "admin";
}
*/
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
      setAdminEditingId(id);
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
      if(ok) {
           userCartMap.set(String(productId), nextQty); // Actualización inmediata
           await handleCartUpdateUI();
      }
    }
  });
}

/* ============================================
   9. MODAL CARRITO & RENDER
   ============================================ */

//const modal = document.querySelector("#guest-cart-modal");
//const modalItems = document.querySelector("#guest-cart-items");
//const modalTotal = document.querySelector("#guest-cart-total");

/*
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
*/
async function renderUserCart() {
  if (!modalItems || !modalTotal) return;
  
  try {
    const res = await fetchUserCartAPI();
    
    // Forzamos la lectura de .data basándonos en tu captura de pantalla
    let items = [];
    if (res && res.data && Array.isArray(res.data)) {
      items = res.data;
    } else if (Array.isArray(res)) {
      items = res;
    }

    console.log("Items REALES a dibujar:", items);

    if (items.length === 0) {
      modalItems.innerHTML = "<p>Tu carrito está vacío.</p>";
      modalTotal.textContent = formatPrice(0);
      userCartMap.clear();
      syncQuantities();
      return;
    }

    userCartMap = new Map(items.map(i => [String(i.productId), i.quantity]));

    modalItems.innerHTML = items.map(i => {
      // Usamos exactamente los nombres que se ven en tu captura (name, price, image_url)
      const name = i.name || "Producto";
      const price = Number(i.price || 0);
      const img = i.image_url || "";

      return `
      <div class="cart-item" data-id="${i.productId}">
        <img class="cart-item__img" src="${img}" alt="${name}"/>
        <div class="cart-item__info">
          <div><strong>${name}</strong></div>
          <div>${formatPrice(price)} x ${i.quantity}</div>
        </div>
        <div class="cart-item__actions">
          <button type="button" data-cart-inc>+</button>
          <span>${i.quantity}</span>
          <button type="button" data-cart-dec>-</button>
          <button type="button" data-cart-remove>✕</button>
        </div>
      </div>`;
    }).join("");
    
    // Usamos el total que ya calculó el servidor (se ve en tu imagen como totalEst)
    const totalMostrado = res.totalEst || items.reduce((acc, x) => acc + (Number(x.price || 0) * x.quantity), 0);
    modalTotal.textContent = formatPrice(totalMostrado);

  } catch (error) {
    console.error("Error crítico en renderUserCart:", error);
    modalItems.innerHTML = "<p>Error al sincronizar datos.</p>";
  }
}

async function openCart() {
  if(!isLogged()) {
    renderGuestCart();
  }else{
    await renderUserCart();
  }

  if(modal){
    modal.hidden = false;

    requestAnimationFrame(positionCartDropdown);
  }
}

//Cerrar: Vulve poner el hidden:

function closeCart() {
  if(modal) modal.hidden =true;
}


function positionCartDropdown(){
  const anchor = document.querySelector("#navbar-cart-link");
  const panel = modal?.querySelector(".modal-content");

  if(!anchor || !panel || !modal || modal.hidden)return;

  const r = anchor.getBoundingClientRect();

  const top = r.bottom + 10;
  const panelWidth = panel.offsetWidth || 380;
  
  let left = r.right - panelWidth;
  left = Math.max(10,Math.min(left,window.innerWidth - panelWidth - 10));

  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
  panel.style.position = "fixed";
}

/* ============================================
   10. EVENTOS NAVBAR & MODAL
   ============================================ */

document.addEventListener("click", async (e) => {
  //1.Abrir carrito desde el navbar
  if(e.target.closest("#navbar-cart-link")){
    e.preventDefault();
    await openCart();
  }

  //2.Cerrar el modal

  if (e.target.closest("#guest-cart-close") || e.target.classList.contains("modal-backdrop")) {
    closeCart(); // Usa tu función ya creada
}
  if(e.target.id === "admin-modal-close" || e.target.id === "admin-modal-cancel" || e.target.closest(".modal-backdrop")){
    if (typeof closeAdminModal === 'function') closeAdminModal();
  }

  //3.Detectar clics en elementos del carrito(necesitamos el id del product)
  if(e.target.id === "guest-cart-clear"){
    if(!isLogged()) {
      setGuestCart([]);
    } else {
      await deleteCartItemAPI();
    }
    await handleCartUpdateUI();
    return;
  }

  //BOTON continuar compra
  if(e.target.id === "guest-cart-continue"){
    if(!isLogged()){
      window.location.href="/auth/login?redirect=checkout";
    }else {
      window.location.href="/checkout";
    }
    return;
  }

  
  const cartItem = e.target.closest("[data-id]");
  if(!cartItem)return;


  const productId = Number(cartItem.getAttribute("data-id"));

  //BOTON DE ELIMINAR(X)
  if(e.target.closest("[data-cart-remove]")){
    if(!isLogged()){
      const cart = getGuestCart().filter(i => i.productId !== productId);
      setGuestCart(cart); 
    }else {
      await deleteCartItemAPI(productId);
    }
    await handleCartUpdateUI();
    return;
  }

  if(e.target.id === "guest-cart-continue") {
    if(!isLogged()) {
      window.location.href = "/auth/login?redirect=checkout";
    } else {
      window.location.href="/checkout";
    }
    return;
  }

  //BOTONES SUMAR (+) Y RESTAR (-)
  const inc = e.target.closest("[data-cart-inc]");
  const dec = e.target.closest("[data-cart-dec]");
  

  if(inc || dec){
    const delta = inc ? 1 : -1;
    if(!isLogged()) {
      const product = getGuestCart().find (i => i.productId === productId);
      if(product) addToGuestCart(product,delta, handleCartUpdateUI);
    }else {
      const currentQty = userCartMap.get(String(productId)) || 0;
      const nextQty = Math.max(0,currentQty + delta);
      const ok = await setUserCartQuantityAPI(productId, nextQty);
      if(ok) {
        if(nextQty > 0){
          userCartMap.set(String(productId),nextQty);
        }else{
          userCartMap.delete(String(productId));
        }
        await handleCartUpdateUI();
      }
    }
  }



});


/* ============================================
   8. INIT (PUNTO 3: CONEXIÓN ADMIN)
   ============================================ */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. ejecutar el merge.
  await mergeGuestCartIfLogged(); // shop-cart.js llamando a shop-api.js
  
  //await refreshCartBadge();
  //2.Importante: Si estamos loguados,cargar el mapa de sesion de inmediato
  if(isLogged()) {
    const res = await fetchUserCartAPI();
    const items = res?.data || res?.items || [];
    userCartMap = new Map(items.map(i=>[String(i.productId),i.quantity]));
  }

  //3.Refrescar UI completa:
  await handleCartUpdateUI();
  
  if (grid) {
    await loadProducts();
    attachCatalogEvents();
  }
  
 const addBtn = document.getElementById("admin-create-product"); 
if(addBtn){
  addBtn.addEventListener("click", () => {
    console.log("Botón presionado, abriendo modal..."); // Esto es para que verifiques en la consola
    setAdminEditingId(null);
    openAdminModal("create");
  });
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