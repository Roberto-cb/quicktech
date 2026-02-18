/* ============================================
   1. ESTADO DE SESIÓN
   ============================================ */


// ¿El usuario está logueado?
function isLogged() {
  return document.body.getAttribute("data-logged") === "1";
}

function isAdmin(){
  return document.body.getAttribute("data-role") === "admin";
}
/* ============================================
   2. CARRITO GUEST (LocalStorage)
   ============================================ */

const GUEST_CART_KEY = "qt_cart_guest";

// Obtener carrito
function getGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || [];
  } catch {
    return [];
  }
}

// Guardar carrito
function setGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

// Cantidad total de productos
function guestCartCount() {
  return getGuestCart().reduce((acc, item) => acc + (item.quantity || 0), 0);
}
//total guest
function guestCartTotal(){
  return getGuestCart().reduce(
    (acc,item) => acc + Number(item.price) * (item.quantity || 0),
    0
  );
}

// Agregar o quitar productos
function addToGuestCart(product, delta) {
  const cart = getGuestCart();
  const index = cart.findIndex((p) => p.productId === product.productId);

  if (index >= 0) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    
  } else if (delta > 0) {
    cart.push({ ...product, quantity: delta });
  }

  setGuestCart(cart);

  refreshCartBadge();
  syncQuantities();
  // ✅ Corrección: solo renderizar si el modal está abierto
  if (modal && modal.hidden === false && !isLogged()) renderGuestCart();
}

async function mergeGuestCartIfLogged() {
  if(!isLogged()) return;

  const guest = getGuestCart();

  if(!Array.isArray(guest) || guest.length === 0 ) return;

  const items = guest
  .map((it)=> ({
    productId: Number(it.productId),
    quantity: Number(it.quantity || 0),

  }))
  .filter((it)=> it.productId > 0 && it.quantity > 0);
  
  if(!items.length) return;

  try{
    const res = await fetch("/cart/merge", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify({items}),
    });

    if(res.ok){
      localStorage.removeItem(GUEST_CART_KEY);
      
      userCartMap = new Map();
      await fetchUserCart();
    }
  }catch(err){
    console.error("Merge guest cart fallo: ", err);
  }
}
/* ============================================
   3. CARRITO LOGUEADO (API /cart)
   ============================================ */

//cache en memoria para calcular nextQty

let userCartMap = new Map();

async function fetchUserCart() {
  const res = await fetch("/cart", {headers: {Accept:"application/json"} });

  if(res.status === 401){
    window.location.href = "/auth/login?expired=true"; 
    return {items: []};
  }
  if(!res.ok) throw new Error("No se pudo obtener el carrito");
  
  const json = await res.json();

  const remoteData = json.data ?? json.items ?? json;

  // Api
  const items =(Array.isArray(remoteData) ? remoteData: (remoteData.items || [])).map((i) =>({
    productId: Number(i.productId),
    name: i.name ?? "Producto",
     image_url: i.image_url ?? "",
    price: Number(i.price),
    quantity:Number(i.quantity),
    lineTotal: Number(i.lineTotal ?? (Number(i.price) * Number(i.quantity))),
  }));
  
  userCartMap = new Map(items.map((i)=> [String(i.productId), i.quantity]));

  return {
    items,
    totalEst: Number(remoteData.totalEst || json.totalEst || 0),
  };
}

//Set quantity final

async function setUserCartQuantity(productId,quantity) {
  const res = await fetch("/cart/items", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({productId, quantity}),
  });
  if(res.status === 401){
    window.location.href ="/auth/login?expired=true";
    return;
  }
  if(!res.ok) throw new Error("No se pudo actualizar el item del carrito");
}

async function removeUserCartItem(productId) {
  const res = await fetch(`/cart/items/${productId}`, {method: "DELETE"});
  if (res.status === 401) { window.location.href = "/auth/login?expired=true"; return; }
  if(!res.ok) throw new Error("No se puedo eliminar el items");
}

async function clearUserCart() {
  const res = await fetch("/cart", {method: "DELETE"});
  if (res.status === 401) { window.location.href = "/auth/login?expired=true"; return; }
  if(!res.ok) throw new Error("No se pudo vaciar el carrito")
}


/* ============================================
   3.1 BADGE DEL NAVBAR
   ============================================ */

async function refreshCartBadge() {
  const badge = document.getElementById("cart-count");
  if(!badge) return;

  //guest
  if(!isLogged()){
    const count = guestCartCount()
    badge.textContent = count;
    badge.hidden = count === 0;
    return;
  }

  //Logged
  try{
    const { items } = await fetchUserCart();
    const count = items.reduce((acc, it) => acc + (it.quantity || 0), 0);
    badge.textContent = count;
    badge.hidden = count === 0;
  }catch{
    badge.hidden = true;
  }
  
}
/* ============================================
   4. RENDER DEL CATÁLOGO
   ============================================ */

const grid = document.getElementById("products-grid");

const adminCreatBtn = document.getElementById("admin-creat-product");
const adminModal = document.getElementById("admin-product-modal");
const adminForm = document.getElementById("admin-product-form");
const adminClose = document.getElementById("admin-modal-close");
const adminCancel = document.getElementById("admin-modal-cancel");
const adminTitle = document.getElementById("admin-modal-title");
const adminSaveBtn = document.getElementById("admin-modal-save");
const adminImportExcelBtn = document.getElementById("admin-import-excel");
const adminExcelInput = document.getElementById("admin-excel-file");


//Helpers: abrir/cerrar + setear modo

let adminEditingId = null;

function openAdminModal(mode){
  if(!adminModal) return;
  adminModal.hidden = false;

  if(adminTitle) adminTitle.textContent = mode === "edit" ? "Editar producto" : "Crear producto";
  if(adminSaveBtn) adminSaveBtn.textContent = mode === "edit" ? "Guardar cambios" : "Guardar";
}

function closeAdminModal(){
  if(!adminModal)return;
  adminModal.hidden = true;
  adminEditingId = null;
  if(adminForm) adminForm.reset();
  const idInput = adminForm?.querySelector('input[name="id"]');
  if(idInput) idInput.value="";
  if(adminExcelInput) adminExcelInput.value = "";
}

//Parseo y armado del payload

function buildAdminPayload(){
  if(!adminForm) return null;
  const fd = new FormData(adminForm);
  const data = Object.fromEntries(fd.entries());
  
  let dimsObj = {};
  try{
    dimsObj = JSON.parse(String(data.dimensions) || "{}");
  }catch{
    throw new Error("Dimensiones: JSON invalido. Ej:  {\"alto\":10,\"ancho\":5}");
  }

  return {
    type: String(data.type || "").trim(),
    category: String(data.category || "").trim(),
    brand: String(data.brand || "").trim(),
    model: String(data.model || "").trim(),
    price: Number(data.price || 0),
    image_url: String(data.image_url || "").trim(),
    features: String(data.features || "").trim(),
    stock: Number(data.stock || 0),
    dimensions: dimsObj,
  };
}

function fillAdminForm(p){
  if(!adminForm) return;
  adminForm.querySelector('[name="brand"]').value = p.brand ?? "";
  adminForm.querySelector('[name="model"]').value = p.model ?? "";
  adminForm.querySelector('[name="category"]').value = p.category ?? "";
  adminForm.querySelector('[name="type"]').value = p.type ?? "";
  
  adminForm.querySelector('[name="price"]').value = String(p.price ?? "");
  adminForm.querySelector('[name="stock"]').value = String(p.stock);
  
  adminForm.querySelector('[name="image_url"]').value = p.image_url ?? "";
  adminForm.querySelector('[name="features"]').value = p.features ?? "";

  adminForm.querySelector('[name="dimensions"]').value = 
  JSON.stringify(p.dimensions ?? {}, 2);
  
  
  const idInput = adminForm.querySelector('input[name="id"]');
  if(idInput) idInput.value = String(p.id);

}
//Crear/Editar: submit del modal

async function adminSaveProduct(e) {
  e.preventDefault();
  if(!isAdmin()) return;
  

  try{
    const payload = buildAdminPayload();
    if(!payload) throw new Error("Formulario admin no encontrado");
    if(adminEditingId){
      await fetch(`/products/${adminEditingId}`,{
        method: "PUT",
        headers: {"Content-Type":"application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if(r.status === 401) {
          window.location.href = "/auth/login?expired=true";
          return;
        }
        if(!r.ok) throw new Error((await r.json()).error || "No se pudo actualizar");
      });
    } else {
      await fetch(`/products`, {
        method:"POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body:JSON.stringify(payload),
      }).then(async (r) => {
         if(r.status === 401) {
          window.location.href = "/auth/login?expired=true";
          return;
        }
        if(!r.ok) throw new Error((await r.json()).error || "No se pudo crear");
      })
    }
    
    closeAdminModal();
    //recargar catalogo y opcional buscar el producto creado
    await loadProducts();
    await syncQuantities();
  }catch(err){
    alert(err.message || "Error guardando producto");
  }
}

async function adminImportExcel(file){
  if (!file) throw new Error("No se seleccionó archivo");
  if(!isAdmin()) throw new Error("No autorizado");

  const formData = new FormData();
  formData.append("excel",file);

  const res = await fetch("/products/import-excel",{
    method: "POST",
    credentials:"include",
    body: formData
  });
  if (res.status === 401) { window.location.href = "/auth/login?expired=true"; return; }

  

  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.error || "Error importando excel");
  return data;
}

function initAdminExcelImport(){
  if(!adminImportExcelBtn || !adminExcelInput) return;

  adminImportExcelBtn.addEventListener("click", async ()=>{
  if(!isAdmin())return;

  const file = adminExcelInput.files?.[0];
  if(!file){
    alert("Selecciona un archivo Excel primero");
    return;
  }

  const name = file.name.toLowerCase();
  if(!name.endsWith(".xlsx") && !name.endsWith(".xls")){
    alert("Solo se permiten archivos .xlsx o .xls");
    adminExcelInput.value = "";
    return;
  }

  const prevText = adminImportExcelBtn.textContent;
  adminImportExcelBtn.disabled = true;
  adminImportExcelBtn.textContent = "Importando...";

  try{
    const result = await adminImportExcel(file);
    const created = result.createdCount ?? 0;
    const failed = result.failedCount ?? 0;

    let msg = `✅ Creados: ${created}\n⚠️ Fallidos: ${failed}`;

    if(failed > 0 && Array.isArray(result.failed)){
      const first = result.failed.splice(0,5)
      .map(x => `Fila ${x.row}: ${x.reason}`)
      .join("\n");
      msg += `\n\nPrimeros errores:\n${first}`;
    }

    alert(`Importacion finalizada\n\n${msg}`);
    //Cerrar modal
    closeAdminModal();
    
    //Recargar catalogo
    await loadProducts();
    await syncQuantities();
    await refreshCartBadge();
    
    adminExcelInput.value = "";
  }catch(err){
    alert(err?.message || "Error importando Excel");
  }finally{
    adminImportExcelBtn.disabled = false;
    adminImportExcelBtn.textContent = prevText || "Importar Excel";
  }
  });
}

//Abril moda "CREAR"

if(adminCreatBtn){
  adminCreatBtn.addEventListener("click", () => {
    if(!isAdmin()) return;
    adminEditingId = null;
    if (adminForm) adminForm.reset();
    openAdminModal("create");
  });
}

//Cerrar modal
if(adminClose) adminClose.addEventListener("click", closeAdminModal);
if(adminCancel) adminCancel.addEventListener("click",closeAdminModal);

document.addEventListener("click", (e) => {
  if(adminModal && !adminModal.hidden){
    if(e.target.closest("#admin-product-modal .modal-backdrop")) closeAdminModal();
  }
});


//

// Si esta página no tiene catálogo, no hacemos nada
if (!grid) {
  console.warn("shop.js cargó en una página sin catálogo");
}

// Formatear precio
function formatPrice(price) {
  return `$${Number(price).toLocaleString("es-AR")}`;
}

// HTML de una card
function productCard(product) {
  const img = product.image_url || "";
  const href = `/product/${product.id}`;

  const inactiveClass = !product.isActive ? "card-inactive" : "";
  const inactiveBadge = !product.isActive
    ? `<span class="badge badge-inactive">Inactivo</span>`
    : "";

  const adminActions = isAdmin()
    ? `
    <div class="admin-card-actions">
      <button type="button" class="btn btn-ghost" data-admin-edit="${product.id}">
        Editar
      </button>

      ${
        product.isActive
          ? `<button type="button" class="btn btn-danger" data-admin-toggle="${product.id}" data-next="0">
               Desactivar
             </button>`
          : `<button type="button" class="btn btn-primary" data-admin-toggle="${product.id}" data-next="1">
               Activar
             </button>`
      }
    </div>
    `
    : "";

  return `
    <article class="card ${inactiveClass}" data-product data-id="${product.id}" data-price="${Number(product.price)}">
      
      ${inactiveBadge}

      <a class="card-link" href="${href}">
        <div class="img-wrap">
          <img
            class="product-img"
            src="${img}"
            alt="${product.brand} ${product.model}"
            loading="lazy"
            decoding="async"
          />
        </div>
        <h3>${product.brand} - ${product.model}</h3>
      </a>

      <p>${product.category}</p>
      <p><strong>${formatPrice(product.price)}</strong></p>

      ${adminActions}

      ${
        product.isActive
          ? `
            <div class="qty-controls">
              <button type="button" data-action="dec">−</button>
              <span data-qty>0</span>
              <button type="button" data-action="inc">+</button>
            </div>
          `
          : `<p class="inactive-text">Producto desactivado</p>`
      }

    </article>
  `;
}

/* ============================================
   5. CARGAR PRODUCTOS DESDE BACKEND
   ============================================ */

async function loadProducts() {
  if (!grid) return;

  try {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") || "").trim();

    const baseUrl = isAdmin() ? "/products/admin" : "/products";
    const apiUrl = q ? `${baseUrl}?q=${encodeURIComponent(q)}` : baseUrl;

    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      credentials: "include", // ✅ clave para /products/admin
    });

    if(res.status === 401){
      window.location.href = "/auth/login?expired=true";
      return;
    }

    // ✅ si el backend responde 401/403, no intentes pintar como si fuera catálogo
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      grid.innerHTML = `<p>Error cargando productos (${res.status}). ${err?.message || ""}</p>`;
      return;
    }

    const json = await res.json();
    const products = json.data ?? json.items ?? json;

    if (!products.length) {
      grid.innerHTML = q
        ? `<p>No se encontraron productos para: <strong>${q}</strong></p>`
        : "<p>No hay productos disponibles.</p>";
      return;
    }

    grid.innerHTML = products.map(productCard).join("");
    syncQuantities();
  } catch (err) {
    console.error(err);
    grid.innerHTML = "<p>Error cargando productos.</p>";
  }
}





/* ============================================
   6. SINCRONIZAR CANTIDADES EN LAS CARDS
   ============================================ */

async function syncQuantities() {

  if(!isLogged()){
  const cart = getGuestCart();
  const map = new Map(cart.map((i) => [String(i.productId), i.quantity]));

  document.querySelectorAll("[data-product]").forEach((card) => {
    const id = card.getAttribute("data-id");
    const qty = map.get(id) || 0;
    const qtyEl = card.querySelector("[data-qty]");
    if (qtyEl) qtyEl.textContent = qty;
  });
  return;
  }

  //logged -- continuacion
  try{
    if (userCartMap.size === 0) await fetchUserCart();
    document.querySelectorAll("[data-product]").forEach((card)=>{
      const id = card.getAttribute("data-id");
      const qty = userCartMap.get(String(id)) || 0;
      const qtyEl = card.querySelector("[data-qty]");
      if (qtyEl) qtyEl.textContent = qty;
    });
  }catch{
    document.querySelectorAll("[data-product] [data-qty]").forEach((el)=>{
      el.textContent = "0";
    });
  }
}

/* ============================================
   7. EVENTOS DEL CATÁLOGO (+ / −)
   ============================================ */

function attachCatalogEvents() {
  if (!grid) return;

  grid.addEventListener("click", async (e) => {
     
    
    
    /* ==============================
       ADMIN: EDIT / DELETE
       ============================== */
    
    const editBtn = e.target.closest("[data-admin-edit]");
    if(editBtn){
      if(!isAdmin()) return;

      const id = Number(editBtn.getAttribute("data-admin-edit"));
      if(!id) return;

      const url = isAdmin() ? `/products/admin/${id}`: `/products/${id}`;
      

      const res = await fetch(url,{headers: {Accept: "application/json"},});

      const product = await res.json();

      adminEditingId = id;
      fillAdminForm(product);
      openAdminModal("edit");
      return;
    }

    const delBtn = e.target.closest("[data-admin-del]");
    if(delBtn){
      if(!isAdmin()) return;
      
      const id = delBtn.getAttribute("data-admin-del");
      if(!id) return;
      if(!confirm("¿Eliminar producto?")) return;

      delBtn.disabled = true;

      try{
        const res = await fetch(`/products/${id}`,{
          method: "DELETE",
          credentials: "include",
        });
        if(!res.ok) throw new Error("No se pudo eliminar");
        await loadProducts();
        await syncQuantities();
      }catch(err){
        delBtn.disabled = false;
        alert(err.message || "Error elimiando producto");
      }
      return;
    }
    const toggleBtn = e.target.closest("[data-admin-toggle]");
    if(toggleBtn){
      if (!isAdmin()) return;
      
      const id = Number(toggleBtn.getAttribute("data-admin-toggle"));
      const next = toggleBtn.getAttribute("data-next") === "1";

      toggleBtn.disabled = true;

      try{
        const res = await fetch(`/products/${id}/active`,{
          method: "PATCH",
          headers: {"Content-Type": "application/json"},
          credentials: "include",
          body: JSON.stringify({isActive: next}),
        });
        if(!res.ok) throw new Error("No se puedo actualizar el estado");

        await loadProducts();
        await syncQuantities();
      }catch(err){
        toggleBtn.disabled = false;
        alert(err.message || "Error cambiando estado");
      }
      return;
    }

    
    
    
    
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const card = btn.closest("[data-product]");
    if (!card) return;
    
    //Arreglando
    const productId = Number(card.getAttribute("data-id"));
    if (!Number.isFinite(productId) || productId <= 0) return;
    const delta = btn.getAttribute("data-action") === "inc" ? 1 : -1;

    if(!isLogged()){
      const product = {
        productId,
        name: card.querySelector("h3").textContent?.trim() || "Producto",
        price: Number(card.getAttribute("data-price") || 0),
        image_url: card.querySelector("img")?.src || ""
      };

      addToGuestCart(product,delta);
      return;
    }

    //Logged: Quantity final
    try{
      const currentQty = userCartMap.get(String(productId)) || 0;
      const nextQty = Math.max(0, currentQty + delta);

      await setUserCartQuantity(productId, nextQty);
      

      //refrescar cache y UI

      await fetchUserCart();
      await refreshCartBadge();
      await syncQuantities();

      if(modal && modal.hidden === false){
        await renderUserCart();
      }
    }catch(err){
      //si 
      console.error(err);
    }
  });

  
}

/* ============================================
   9. MODAL CARRITO (HOME)
   ============================================ */

const modal = document.querySelector("#guest-cart-modal");
const modalItems = document.querySelector("#guest-cart-items");
const modalTotal = document.querySelector("#guest-cart-total");

function positionCartDropdown(){
  const anchor = document.querySelector("#navbar-cart-link");
  const panel = modal?.querySelector(".modal-content");
  
  if( !anchor || !panel || !modal || modal.hidden) return;

  const r = anchor.getBoundingClientRect();

  //debajo del icono
  const top = r.bottom + 10;

  //alineado a la derecha del icono
  const panelWidth = panel.offsetWidth || 360;
  let left = r.right - panelWidth;

  //evitart que se salga de pantall

  left = Math.max(10,Math.min(left, window.innerWidth - panelWidth - 10));

  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}

function renderGuestCart() {
  if (!modalItems || !modalTotal) return;

  const items = getGuestCart();

  if (!items.length) {
    modalItems.innerHTML = "<p>Tu carrito está vacío.</p>";
    // ✅ Bonus: textContent en vez de innerHTML
    modalTotal.textContent = formatPrice(0);
    return;
  }

  modalItems.innerHTML = items.map(i => `
  <div class="cart-item" data-id="${i.productId}">
    <img class="cart-item__img" src="${i.image_url || ''}" alt="${i.name}" />

    <div class="cart-item__info">
      <div class="cart-item__name">${i.name}</div>
      <div class="cart-item__price">${formatPrice(i.price)}</div>
    </div>

    <div class="cart-item__actions">
      <button class="cart-item__btn" data-cart-inc>+</button>
      <span class="cart-item__qty">${i.quantity}</span>
      <button class="cart-item__btn" data-cart-dec>−</button>

      <button class="cart-item__remove" data-cart-remove aria-label="Eliminar">✕</button>
    </div>
  </div>
`).join("");

  modalTotal.textContent = formatPrice(guestCartTotal());
}

//Render Logged
async function renderUserCart(){
  if(!modalItems || !modalTotal) return;

  try{
    const{items,totalEst} = await fetchUserCart();
    if(!items.length){
      modalItems.innerHTML = "<p>Tu carrito esta vacio</p>";
      modalTotal.textContent = formatPrice(0);
      return;
    }
    modalItems.innerHTML = items.map(i => `
  <div class="cart-item" data-id="${i.productId}">
    <img class="cart-item__img" src="${i.image_url || ''}" alt="${i.name}" />

    <div class="cart-item__info">
      <div class="cart-item__name">${i.name}</div>
      <div class="cart-item__price">${formatPrice(i.price)}</div>
    </div>

    <div class="cart-item__actions">
      <button class="cart-item__btn" data-cart-inc>+</button>
      <span class="cart-item__qty">${i.quantity}</span>
      <button class="cart-item__btn" data-cart-dec>−</button>

      <button class="cart-item__remove" data-cart-remove aria-label="Eliminar">✕</button>
    </div>
  </div>
`).join("");

    modalTotal.textContent = formatPrice(totalEst);
  }catch(err){
    console.error(err);
    modalItems.innerHTML = "<p>No se pudo cargar el carrito</p>"
    modalTotal.textContent = formatPrice(0);
  }
  
}

async function openCart() {
  if(!isLogged()){
    renderGuestCart();
  }else{
    await renderUserCart();
  }
  if (!modal) return;
  
  modal.hidden = false;

  requestAnimationFrame(positionCartDropdown);
}

function closeCart(){
  if(modal) modal.hidden = true;
}

window.addEventListener("resize", ()=>{
  if(modal && !modal.hidden) positionCartDropdown();
});

window.addEventListener("scroll",()=>{
  if(modal && !modal.hidden) positionCartDropdown();
}, {passive:true});
/* ============================================
   10. EVENTOS NAVBAR + MODAL
   ============================================ */

document.addEventListener("click", async (e) => {
  // Abrir carrito desde navbar
  const cartLink = e.target.closest("#navbar-cart-link");
  if (cartLink) {
    e.preventDefault();
    await openCart();
    return;
  }

  // Cerrar el modal
  if (
    e.target.closest("#guest-cart-close") ||
    e.target.closest(".modal-backdrop")
  ) {
    closeCart();
    return;
  }

  // Vaciar carrito
  if (e.target.closest("#guest-cart-clear")) {
    if(!isLogged()){
      setGuestCart([]);
      renderGuestCart();
      await refreshCartBadge();
      await syncQuantities();
    }else{
      try{
        await clearUserCart();
        await fetchUserCart();
        await renderUserCart();
        await refreshCartBadge();
        await syncQuantities();
      }catch(err){
        console.error(err);
      }
    }
    return;
}

  // Continuar compra
  if (e.target.closest("#guest-cart-continue")) {

    //Calculamos la cantidad actual segun el estado
    let count = 0;

    if (!isLogged()) {
      count = guestCartCount();
      //location.href = "/auth/login?next=/checkout";
    } else {
      count = Array.from(userCartMap.values()).reduce((acc,q) => acc + q, 0);
      //location.href = "/checkout";
    }
    if(count === 0){
      e.preventDefault();
      Swal.fire({
        icon: 'info',
        title: 'Carrito Vacio',
        text: 'Agrega algunos productos antes de ir al checkout',
        background: '#1a1a1a',
        color: '#ffffff',
        confirmButtonColor: '#28a745'
      });
      return;
    }
    if(!isLogged()){
      location.href = "/auth/login?next=/checkout";
    }else {
      location.href = "/checkout";;
    }
    return;
   
  }

  // Acciones dentro del modal (+, -, remove)
  const row = e.target.closest(".cart-item");
  if (!row) return;

  const pid = Number(row.getAttribute("data-id"));
  
  if(!isLogged()){
  const items = getGuestCart();

  if (e.target.closest("[data-cart-inc]")) {
    const it = items.find((x) => x.productId === pid);
    if (it) it.quantity += 1;
    setGuestCart(items);
    renderGuestCart();
    await refreshCartBadge();
    await syncQuantities();
    return;
   }
  
  if (e.target.closest("[data-cart-dec]")) {
    const it = items.find((x) => x.productId === pid);
    if (it) {
      it.quantity = Math.max(0, it.quantity - 1);
      if (it.quantity === 0) items.splice(items.indexOf(it), 1);
    }
    setGuestCart(items);
    renderGuestCart();
    await refreshCartBadge();
    await syncQuantities();
    return;
  }
  

  if (e.target.closest("[data-cart-remove]")) {
    const next = items.filter((x) => x.productId !== pid);
    setGuestCart(next);
    renderGuestCart();
    await refreshCartBadge();
    await syncQuantities();
    return;
  }
  return;
  }

  //Logged Modal Actions
  try{
    const currentQty = userCartMap.get(String(pid)) || 0;

    if(e.target.closest("[data-cart-inc]")){
      const nextQty = currentQty + 1;
      await setUserCartQuantity(pid,nextQty);
      await fetchUserCart();
      await renderUserCart();
      await refreshCartBadge();
      await syncQuantities();
      return;
    }

    if(e.target.closest("[data-cart-dec]")){
      const nextQty = Math.max(0,currentQty -1);
      await setUserCartQuantity(pid,nextQty);
      await fetchUserCart();
      await renderUserCart();
      await refreshCartBadge();
      await syncQuantities();
      return;
    }

    if(e.target.closest("[data-cart-remove]")){
      await removeUserCartItem(pid);
      await fetchUserCart();
      await renderUserCart();
      await refreshCartBadge();
      await syncQuantities();
    }
  }catch(err){
    console.error(err);
  }
});

/* ============================================
   8. INIT (ARRANQUE)
   ============================================ */

document.addEventListener("DOMContentLoaded", async () => {
  await mergeGuestCartIfLogged();
  await refreshCartBadge(); // siempre
   
  if (grid) {
    await loadProducts();
    attachCatalogEvents();
  }

  if(adminForm) adminForm.addEventListener("submit", adminSaveProduct);
  initAdminExcelImport();
});








































