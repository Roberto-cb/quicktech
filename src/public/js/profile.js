

const BASE_URL = "";

//Funcion para llamar a las apis
async function apiGet(path) {
    const res = await fetch(BASE_URL + path, { credentials: "include" });
    if (!res.ok) {
        let msg = res.statusText;
        try {
            const err = await res.json();
            msg = err.error || err.message || msg;

        } catch { };

        throw new Error(`Error ${res.status}: ${msg}`)
    }
    let json = {};
    try { json = await res.json(); } catch { return {}; }


    //Normalizar formatos
    if (Array.isArray(json)) return json;
    if (json.payload) return json.payload;
    if (json.items) return json.items;
    if (json.orders) return json.orders;
    if (json.data) return json.data;
    return json;
}


async function apiPut(path, bodyObj) {
    const res = await fetch(BASE_URL + path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bodyObj),
    });
    if (!res.ok) {
        let msg = res.statusText;
        try {
            const err = await res.json();
            msg = err.error || err.message || msg;
        } catch { }
        throw new Error(`Error ${res.status}: ${msg}`);
    }
    try { return await res.json(); } catch { return {}; }

}

async function apiPost(path,bodyObj) {
    const res = await fetch(BASE_URL + path,{
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials:"include",
        body: JSON.stringify(bodyObj),
    });
    if(!res.ok){
        let msg = res.statusText;
        try{
            const err = await res.json();
            msg = err.error || err.message || msg;
        }catch{}
        throw new Error(`Error ${res.status}: ${msg}`);
    }
    try{return await res.json();}catch{return{};}
    
}

async function  apiDelete(path) {
    const res = await fetch(BASE_URL + path, {
        method: "DELETE",
        credentials: "include",
    })
    if(!res.ok){
        let msg = res.statusText;
        try{
            const err = await res.json();
            msg = err.error || err.message || msg;
        }catch{}
        throw new Error( `Error ${res.status}: ${msg}`);
    }
    try{return await res.json();} catch{return{};}
    
}
//Manejo de tabs

(function setUpTabs() {
    const tabs = document.querySelectorAll(".profile-tab");
    const panes = document.querySelectorAll(".tab-pane");

    //Mostrar el cuerpo de los elemento html del profile
    function showTab(id) {
        panes.forEach(p => p.classList.toggle("is-visible", p.id === id));
        tabs.forEach(t => t.classList.toggle("is-active", t.dataset.tab === id));
    }

    tabs.forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.tab;
            if (id) showTab(id);
        })
    })
    showTab("tab-personal");
})();


//-------Referencias de Dom

const root = document.querySelector("#profileRoot");
const userId = root?.dataset.userid;
const personalForm = document.querySelector("#personalForm");
const personalMsg = document.querySelector("#personalMsg");
const cartList = document.querySelector("#cartList");
const orderList = document.querySelector("#ordersList");

const userRole = root?.dataset.role || "";

const productForm =  document.querySelector("#productForm");
const productMsg =  document.querySelector("#productMsg");
const adminProductsList =  document.querySelector("#adminProductsList");
const adminSearch=  document.querySelector("#adminSearch");
const btnReloadProducts =  document.querySelector("#btnReloadProducts");
const btnCancelEdit =  document.querySelector("#btnCancelEdit");
//




//Datos: Personales.


async function loadPersonal() {
    if (!userId || !personalForm) return;
    try {
        personalMsg.textContent = "Cargando tus datos...";
        ///Realiza la busqueda 
        const raw = await apiGet(`/users/${userId}`);
        //Los almacenamos en un array
        const me = Array.isArray(raw) ? raw[0] : raw;

        personalForm.first_name.value     = me.first_name ?? "";
        personalForm.last_name.value      = me.last_name ?? "";
        personalForm.dni.value            = me.dni ?? "";
        personalForm.age.value            = me.age ?? "";
        personalForm.email.value          = me.email ?? "";
        personalForm.state.value          = me.state ?? "";
        personalForm.city.value           = me.city ?? "";
        personalForm.street.value         = me.street ?? "";
        personalForm.street_number.value  = me.street_number ?? "";
        personalForm.postal_code.value    = me.postal_code ?? "";
        personalMsg.textContent           = "";
    } catch (err) {
        personalMsg.textContent = err.message || "No se pudo cargar tus datos";
    }
}

if (personalForm) {
    personalForm.addEventListener("submit", async (event) => {
        //Evita enviar el formulario por default.
        event.preventDefault();
        if (!userId) return;
        try {
            personalMsg.textContent = "Guardando..."
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());
            if(data.age) data.age = Number(data.age);
            await apiPut(`/users/${userId}`, data);
            personalMsg.textContent = "Datos guardados";

        } catch (err) {
            personalMsg.textContent = err.message || " No se pudo guardar tus datos"
        }
    });
}

//
// 2 carrito
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  const n = toNumber(value);
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

async function loadCart() {
  if (!cartList) return;

  cartList.innerHTML = `<p>Cargando carrito...</p>`;

  try {
    const items = await apiGet("/cart");

    if (!Array.isArray(items) || items.length === 0) {
      cartList.innerHTML = `<p>No tenés ningún producto en el carrito.</p>`;
      return;
    }

    let totalCents = 0;

    cartList.innerHTML =
      items
        .map((it) => {
          const p = it.product || {};

          const productId =
            it.productId ??
            it.product_id ??
            p.id ??
            p.productId ??
            p.product_id;

          const brand = p.brand ?? it.brand ?? "";
          const model = p.model ?? it.model ?? "";
          const name =
            it.name ??
            (brand || model ? `${brand} ${model}`.trim() : "Producto");

          const img =
            it.image_url ??
            it.imageUrl ??
            p.image_url ??
            p.imageUrl ??
            "";

          const price = toNumber(
            it.price?.value ??
              it.price ??
              p.price?.value ??
              p.price ??
              0
          );

          const qty = Number(it.quantity ?? 0);

          const priceCents = Math.round(price * 100);
          const subtotalCents = priceCents * qty;
          totalCents += subtotalCents;

          return `
            <div class="cart-item" data-id="${productId}">
              <img class="cart-item__img" src="${img}" alt="${name}" />

              <div class="cart-item__info">
                <div class="cart-item__name">${name}</div>
                <div class="cart-item__price">
                  Cant: ${qty} — ${money(price)} → Subtotal: ${money(subtotalCents / 100)}
                </div>
              </div>

              <div class="cart-item__actions">
                <button class="cart-item__remove" data-remove="${productId}" aria-label="Quitar">✕</button>
              </div>
            </div>
          `;
        })
        .join("") +
      `<p style="margin-top:12px;"><strong>Total estimado: ${money(totalCents / 100)}</strong></p>`;

    // Quitar item
    cartList.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-remove");
        if (!id) return;

        btn.disabled = true;
        try {
          await apiDelete(`/cart/items/${id}`);
          await loadCart();
        } catch (e) {
          btn.disabled = false;
          alert(e.message || "No se pudo quitar el producto");
        }
      });
    });
  } catch (err) {
    cartList.innerHTML = `<p>${err.message || "No se pudo cargar el carrito"}</p>`;
  }
}


async function getCartRaw() {
    const res = await fetch("/cart",{
        credentials: "include",
        headers: {"Accept": "application/json"},
    });
    if(!res.ok) throw new Error("No se pudo obtener el carrito");
    return res.json();
}

// --- Helpers UI ---
function monthLabel(mIdx) {
  const names = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return names[mIdx] ?? `Mes ${mIdx + 1}`;
}

function plural(n, one, many) {
  return n === 1 ? one : many;
}

// Toggle genérico (event delegation) — sin duplicar listeners
function bindOrdersToggles() {
  if (!orderList) return;
  if (orderList.dataset.togglesBound === "1") return;
  orderList.dataset.togglesBound = "1";

  orderList.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-toggle]");
    if (!btn) return;

    // 🔒 evita efectos raros por bubbling/submit
    e.preventDefault();
    e.stopPropagation();

    const targetId = btn.getAttribute("data-target");
    if (!targetId) return;

    const panel = document.getElementById(targetId);
    if (!panel) return;

    const isHidden = panel.hasAttribute("hidden");
    const willOpen = isHidden;

    if (willOpen) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "");

    btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    if (!btn.hasAttribute("aria-controls")) btn.setAttribute("aria-controls", targetId);

    // opcional: si cierro un AÑO, cierro también sus MESES
    if (btn.getAttribute("data-toggle") === "year" && !willOpen) {
      panel.querySelectorAll('[data-toggle="month"]').forEach((mb) => {
        const tid = mb.getAttribute("data-target");
        if (!tid) return;
        const mp = document.getElementById(tid);
        if (mp) mp.setAttribute("hidden", "");
        mb.setAttribute("aria-expanded", "false");
      });
    }
  });
}

// --- HISTORIAL DE COMPRAS (Año > Mes) ---
async function loadOrders() {
  if (!orderList) return;
  orderList.innerHTML = `<p>Cargando historial...</p>`;

  try {
    const res = await apiGet("/orders/mine");
    const orders = Array.isArray(res) ? res : (res.orders || res.items || res.data || []);

    if (!Array.isArray(orders) || orders.length === 0) {
      orderList.innerHTML = `<p>Todavía no realizaste compras.</p>`;
      return;
    }

    // Agrupar por AÑO y MES
    const byYear = new Map(); // year -> Map(monthIdx -> orders[])
    for (const o of orders) {
      const d = o.date ? new Date(o.date) : new Date();
      const year = d.getFullYear();
      const month = d.getMonth();

      if (!byYear.has(year)) byYear.set(year, new Map());
      const byMonth = byYear.get(year);

      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month).push(o);
    }

    // Ordenar años DESC
    const years = Array.from(byYear.keys()).sort((a, b) => b - a);

    // Default: mes actual si existe, si no el último disponible
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let defaultYear, defaultMonth;

    if (byYear.has(currentYear) && byYear.get(currentYear).has(currentMonth)) {
      defaultYear = currentYear;
      defaultMonth = currentMonth;
    } else {
      defaultYear = years[0];
      const monthsDesc = Array.from(byYear.get(defaultYear).keys()).sort((a, b) => b - a);
      defaultMonth = monthsDesc[0];
    }

    let html = `<div class="orders-accordion">`;

    for (const year of years) {
      const monthsMap = byYear.get(year);
      const monthsAsc = Array.from(monthsMap.keys()).sort((a, b) => a - b);

      const monthsCount = monthsAsc.length;
      const openYear = year === defaultYear;

      html += `
        <section class="orders-year">
          <button class="orders-toggle year-toggle"
            type="button"
            data-toggle="year"
            data-target="year-${year}"
            aria-expanded="${openYear ? "true" : "false"}"
            aria-controls="year-${year}">
            <span><strong>${year}</strong></span>
            <span class="muted">(${monthsCount} ${plural(monthsCount, "mes", "meses")} con compras)</span>
          </button>

          <div class="orders-panel" id="year-${year}" ${openYear ? "" : "hidden"}>
      `;

      for (const mIdx of monthsAsc) {
        const monthOrders = monthsMap.get(mIdx) || [];

        // Ordenar órdenes del mes por fecha DESC
        monthOrders.sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });

        // Total del mes
        let monthTotal = 0;
        for (const o of monthOrders) {
          monthTotal += Number(o.total?.value ?? o.total ?? 0);
        }

        const openMonth = year === defaultYear && mIdx === defaultMonth;

        html += `
          <section class="orders-month">
            <button class="orders-toggle month-toggle"
              type="button"
              data-toggle="month"
              data-target="month-${year}-${mIdx}"
              aria-expanded="${openMonth ? "true" : "false"}"
              aria-controls="month-${year}-${mIdx}">
              <span><strong>${monthLabel(mIdx)}</strong></span>
              <span class="muted">${monthOrders.length} ${plural(monthOrders.length, "orden", "órdenes")} • Total: ${money(monthTotal)}</span>
            </button>

            <div class="orders-panel" id="month-${year}-${mIdx}" ${openMonth ? "" : "hidden"}>
        `;

        for (const o of monthOrders) {
          const dateStr = o.date ? new Date(o.date).toLocaleString() : "";
          const total = Number(o.total?.value ?? o.total ?? 0);

          const details = o.saleDetails || o.items || o.orderDetails || [];

          const itemsHTML = details
            .map((d) => {
              const p = d.product || {};
              const qty = d.quantity ?? 0;
              const sub = Number(d.subtotal?.value ?? d.subtotal ?? 0);
              const label = `${(p.brand ?? "")} ${(p.model ?? "")}`.trim() || "Producto";
              return `<li>${label} x ${qty} — ${money(sub)}</li>`;
            })
            .join("");

          html += `
            <div class="item-row">
              <p>
                <strong>Orden #${o.id}</strong><br>
                Fecha: ${dateStr} — TOTAL: ${money(total)}
              </p>
              <ul style="margin:0; padding-left: 1rem;">
                ${itemsHTML}
              </ul>
            </div>
          `;
        }

        html += `
            </div>
          </section>
        `;
      }

      html += `
          </div>
        </section>
      `;
    }

    html += `</div>`;
    orderList.innerHTML = html;

    // ✅ bind una sola vez
    bindOrdersToggles();
  } catch (err) {
    orderList.innerHTML = `<p>${err.message || "No se pudo cargar el historial"}</p>`;
  }
}

//4 Tarjeta de credito (SOLO FRONT - LOCALSTORAGE)


const cardForm = document.querySelector("#cardForm");
const cardList = document.querySelector("#cardsList");

const CARDS_KEY = "qt_cards_" + (userId || "guest");

//Estado interno para editarlo
let editingIndex = null;

//Helpers de storage

function readCards(){
    try{return JSON.parse(localStorage.getItem(CARDS_KEY) || "[]")}
    catch{ return [];}
}
function writeCards(arr){
    localStorage.setItem(CARDS_KEY,JSON.stringify(arr));
}

//Helpers de UI

function maskNumber(n){
    const digits =(n || "").replace(/\D/g, "");
    //enmascaramos todo menos los ultimos 4 y agrupa en 4
    return digits.replace(/.(?=.{4})/g, "•").replace(/(.{4})/g, "$1 ").trim();
}

function setFormCard(card){
    //Completa el for con una tarjeta existente(para editar);
    cardForm.holder.value = card.holder ?? "";
    cardForm.number.value = card.number ?? "";
    cardForm.expiry.value = card.expiry ?? "";
    cardForm.cvv.value = card.cvv ?? "";
}

function clearForm(){
    if(!cardForm) return;
    cardForm.reset();
    editingIndex = null;
    const submitBtn =cardForm.querySelector('button[type = "submit"]');
    if(submitBtn) submitBtn.textContent = "Agregar  tarjeta";

}


//RENDER DEL LISTADO

function renderCards(){
    if(!cardList)return;
    const cards = readCards();


    if(!cards.length){
        cardList.innerHTML = ` <p>No agregastes tarjtas</p>`;
        return;
    }


    let html="";
    cards.forEach((c,i)=>{
        html +=  `
      <div class="item-row">
        <p>
          <strong>${c.holder || "(Sin titular)"}</strong><br>
          ${maskNumber(c.number)} — Vence: ${c.expiry || "--/--"}
        </p>
        <div>
          <button class="btn" data-edit="${i}">Editar</button>
          <button class="btn" data-del="${i}">Eliminar</button>
        </div>
      </div>
    `;
    });
    cardList.innerHTML = html;

    //Listeners Editar / eliminar 

    const editBtns = cardList.querySelectorAll("[data-edit]");
    editBtns.forEach(btn =>{
       btn.addEventListener("click",()=>{
        const idx = Number(btn.getAttribute("data-edit"));
        const cards = readCards();
        const card = cards[idx];
        if(!card) return;
       editingIndex = idx;
       setFormCard(card);
       const submitBtn =  cardForm?.querySelector('button[type= "submit"]');
       if(submitBtn) submitBtn.textContent = "Guardar cambios";

       })
    })

    const delBtns = cardList.querySelectorAll("[data-del]");
    delBtns.forEach(btn =>{
        btn.addEventListener("click",()=>{
            const idx = Number(btn.getAttribute("data-del"));
            const cards = readCards();

            cards.splice(idx,1);
            writeCards(cards);
            
            if(editingIndex === idx) clearForm();
            renderCards();
        })
    })
}

//---Submit de formulari(create/update)

if(cardForm){
    cardForm.addEventListener("submit", (e)=>{
        e.preventDefault();

        const formData = new FormData(cardForm);
        const data = Object.fromEntries(formData.entries());

        const cards = readCards();

        if(editingIndex === null){
         cards.push(data);
        }else {
            cards[editingIndex] = data;
        }
        
        writeCards(cards);
        renderCards();
        clearForm();
    });
}

const cardsTabBtn = document.querySelector('[data-tab="tab-cards"]');

if(cardsTabBtn){
    cardsTabBtn.addEventListener("click",renderCards, {once:true})
}

//Estado admin

let adminProductsCache = [];
let editingProductId = null;

function setProductFormMode(mode){
    if(!productForm) return;
    const saveBtn = productForm.querySelector("#btnSaveProduct");
    if(mode == "edit"){
        if(saveBtn) saveBtn.textContent = "Guardar cambios";
        if(btnCancelEdit) btnCancelEdit.hidden = false;
    } else {
        if(saveBtn) saveBtn.textContent = "Crear producto";
        if(btnCancelEdit) btnCancelEdit.hidden = true;
        editingProductId = null;
        productForm.reset();
        const idInput = productForm.querySelector('input[name="id"]');
        if(idInput) idInput.value = "";
    }
}

if(btnCancelEdit){
    btnCancelEdit.addEventListener("click",()=>{
        setProductFormMode("create");
        if(productMsg) productMsg.textContent = "";
    });
}

function buildPayloadFromForm(){
    const fd = new FormData(productForm);
    const data = Object.fromEntries(fd.entries());

    const dimensions = {
        largo: data.dim_largo ? Number(data.dim_largo) : 0,
        ancho: data.dim_ancho ? Number(data.dim_ancho) : 0,
        grosor: data.dim_grosor ? Number(data.dim_grosor) : 0,
    }

    return {
        type: data.type,
        category: data.category,
        brand: data.brand,
        model: data.model,
        price: Number(data.price),
        stock:  data.stock === "" ? 0: Number(data.stock),
        image_url: data.image_url,
        features: data.features,
        dimensions,
    };
}


function fillFormWithProduct(p){
    if(!productForm) return;

    const idInPut = productForm.querySelector('input[name="id"]');
    if(idInPut) idInPut.value = String(p.id);

    productForm.type.value = p.type ?? "";
    productForm.category.value = p.category ?? "";
    productForm.brand.value = p.brand ?? "";
    productForm.model.value = p.model ?? "";
    productForm.price.value = Number(p.price ?? 0);
    productForm.stock.value = p.stock ?? 0;
    productForm.image_url.value = p.image_url ?? "";
    productForm.features.value = p.features ?? "";
    
    const d = p.dimensions || {};
    
    productForm.dim_largo.value = d.largo ?? "";
    productForm.dim_ancho.value = d.ancho ?? "";
    productForm.dim_grosor.value = d.grosor ?? "";
}

// Render


function renderAdminProducts(list){
    if(!adminProductsList) return;
    
    if(!list.length){
        adminProductsList.innerHTML = `<p class="form-hint">No hay productos para mostrar.</p>`;
        return;
    }

    adminProductsList.innerHTML = list.map(p=> `
        <div class="item-row">
            <p>
                <strong>#${p.id} ${p.brand ?? ""} ${p.model ?? ""}</strong><br>
                $ ${Number(p.price ?? 0)} - Stock: ${p.stock ?? 0}<br>
                <span style ="color: var(--header-muted); font-size: .9rem;">
                ${p.category ?? "" } • ${p.type ?? ""}
                </span> 
            </p>
            <div class="admin-prod-actions">
                <button class="btn" data-edit="${p.id}">Editar</button>
                <button class="btn btn-danger" data-del="${p.id}">Eliminar</button>
            </div>
        </div>
    `).join("")

    adminProductsList.querySelectorAll("[data-edit]").forEach(btn =>{
        btn.addEventListener("click", ()=>{
            const id = Number(btn.getAttribute("data-edit"));
            const p = adminProductsCache.find(x => x.id === id);
            if(!p) return;
            editingProductId = id;
            fillFormWithProduct(p);
            setProductFormMode("edit");
            window.scrollTo({top: 0, behavior: "smooth"});
        });
    });
    adminProductsList.querySelectorAll("[data-del]").forEach(btn =>{
        btn.addEventListener("click", async ()=>{
            const id = btn.getAttribute("data-del");
            if(!id) return;
            if(!confirm("¿Eiminar producto?")) return;

            btn.disabled = true;
            try{
                await apiDelete(`/products/${id}`);
                await loadAdminProducts();

            }catch(e){
                btn.disabled = false;
                alert(e.message || "No se pudo eliminar");
            }
        })
    })
}




async function loadAdminProducts() {
    if(!adminProductsList) return;
    adminProductsList.innerHTML = `<p class="form-hint">Cargando productos....</p>`;
    
    try{
    const items = await apiGet("/products?page=1&pageSize=50&sort=newest");
    adminProductsCache = Array.isArray(items) ? items : (items.items || []);
    renderAdminProducts(adminProductsCache);
    }catch(e){
        adminProductsList.innerHTML =  `<p class="form-hint"> ${e.message || "Error cargando productos"}</p>`;

    }
}

if(btnReloadProducts){
    btnReloadProducts.addEventListener("click",()=>{
        if(userRole !== "admin") return;
        loadAdminProducts();
    });
}


if(adminSearch) {
    adminSearch.addEventListener("input", ()=>{
        const q = adminSearch.value.trim().toLowerCase();
        const filtered = !q ? adminProductsCache : adminProductsCache.filter( p =>{
            const hay = `${p.brand ?? ""} ${p.model ?? ""} ${p.category ?? ""} ${p.type ?? ""}`.toLowerCase();
            return hay.includes(q);
        });
        renderAdminProducts(filtered);
    });
}

if(productForm){
    productForm.addEventListener("submit", async(e)=>{
       e.preventDefault();
       if(userRole !== "admin") return;

       try{
        if(productMsg) productMsg.textContent = editingProductId ? "Guardando...." : "Creando...";
        const payload = buildPayloadFromForm();

        if(editingProductId){
            await apiPut(`/products/${editingProductId}`,payload);
            if(productMsg) productMsg.textContent = "Producto actualizado ✅";
        }else {
            await apiPost("/products", payload);
            if(productMsg) productMsg.textContent = "Product Creando ✅";
        }

        setProductFormMode("create");
        await loadAdminProducts();
       }catch(e2){
        if(productMsg) productMsg.textContent = e2.message || "Error en producto";
       }
    })
}



// Init
(async function initProfile() {
    await loadPersonal();
    

    const cartTabBtn = document.querySelector('[data-tab="tab-cart"]');
    const ordersTabBtn = document.querySelector('[data-tab="tab-orders"]');
    if(cartTabBtn) cartTabBtn.addEventListener("click",loadCart, {once: true});
    if(ordersTabBtn) ordersTabBtn.addEventListener("click", loadOrders,{once:true});

    const adminTabBtn = document.querySelector('[data-tab="tab-admin-products"]');
    if(adminTabBtn) adminTabBtn.addEventListener("click", loadAdminProducts, {once:true});
})();