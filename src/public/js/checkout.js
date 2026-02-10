// public/js/checkout.js

function formatMoney(n){
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

function setMsg(text, ok = true){
  const msg = document.getElementById("checkout-msg");
  if(!msg) return;
  msg.textContent = text;
  msg.style.color = ok ? "lightgreen" : "salmon";
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: {"Content-Type": "application/json"},
    ...options,
  });

  const data = await res.json().catch(()=>({}));

  if(!res.ok) {
    const msg = data?.message || data?.error || "ERROR";
    throw new Error(msg);
  }
  return data;
}

/* ============================
   Tarjetas fake (LocalStorage)
   ============================ */

function getCardsKey(){
  const uid = document.body.getAttribute("data-userid") || "guest";
  return "qt_cards_" + uid;
}

function readCards(){
  try{
    return JSON.parse(localStorage.getItem(getCardsKey()) || "[]");
  }catch{
    return [];
  }
}

function maskNumber(n){
  const digits = String(n || "").replace(/\D/g, "");
  return digits.replace(/.(?=.{4})/g, "•").replace(/(.{4})/g, "$1 ").trim();
}

function loadCardsIntoSelect(){
  const select = document.getElementById("card-select");
  if(!select) return;

  // Placeholder NO seleccionable
  select.innerHTML = `<option value="" selected disabled>— Seleccioná una tarjeta —</option>`;

  const cards = readCards();
  if(!cards.length) return;

  cards.forEach((c, idx) => {
    const opt = document.createElement("option");
    opt.value = `idx_${idx}`;
    const holder = c.holder || "Sin titular";
    const num = maskNumber(c.number);
    const exp = c.expiry || "--/--";
    opt.textContent = `${holder} - ${num} (Vence ${exp})`;
    select.appendChild(opt);
  });
}

/* ============================
   Carrito (API /cart)
   ============================ */

function renderCart(cart){
  const box = document.getElementById("checkout-items");
  const totalEl = document.getElementById("checkout-total");
  const btn = document.getElementById("confirm-checkout");

  if(!box || !totalEl || !btn) return;

  const items = cart?.items || [];
  const totalEst = Number(cart?.totalEst || 0);

  if(!items.length){
    box.innerHTML = "<p>Tu carrito está vacío</p>";
    totalEl.textContent = formatMoney(0);
    btn.disabled = true;
    return;
  }

  box.innerHTML = items.map(it => {
    const name = it.name || "Producto";
    const img = it.image_url || "https://via.placeholder.com/56";
    const qty = Number(it.quantity || 0);
    const lineTotal = Number(it.lineTotal || 0);

    return `
      <div class="checkout-item">
        <img src="${img}" class="checkout-item__img"/>
        <div class="checkout-item__info">
          <div>${name}</div>
          <small>Cantidad: ${qty}</small>
        </div>
        <div>${formatMoney(lineTotal)}</div>
      </div>
    `;
  }).join("");

  totalEl.textContent = formatMoney(totalEst);

  // habilitar solo si hay tarjeta seleccionada
  const cardSelected = Boolean(document.getElementById("card-select")?.value);
  btn.disabled = !cardSelected;

  if(!cardSelected){
    setMsg("Seleccioná una tarjeta para continuar.", false);
  } else {
    setMsg("", true);
  }
}

async function loadCheckout() {
  try{
    loadCardsIntoSelect();
    const cart = await fetchJSON("/cart");
    renderCart(cart);

    const cards = readCards();
    if(!cards.length){
      const btn = document.getElementById("confirm-checkout");
      if(btn) btn.disabled = true;
      setMsg("No tenés tarjetas guardadas. Agregá una en tu perfil.", false);
    }
  }catch(e){
    console.error(e);
    setMsg("No se pudo cargar el carrito.", false);
    const btn = document.getElementById("confirm-checkout");
    if(btn) btn.disabled = true;
  }
}

/* ============================
   Confirmar compra
   ============================ */

async function confirmCheckout() {
  const btn = document.getElementById("confirm-checkout");
  if(!btn) return;

  const select = document.getElementById("card-select");
  const cardId = select?.value || "";

  if(!cardId){
    setMsg("⚠️ Tenés que seleccionar una tarjeta.", false);
    return;
  }

  btn.disabled = true;

  try{
    setMsg("Procesando compra...");

    const order = await fetchJSON("/orders/checkout", {
      method: "POST",
      body: JSON.stringify({ cardId }),
    });

    setMsg(`✅ Compra realizada. Orden #${order.id} · Total: ${order.total}`, true);

    const box = document.getElementById("checkout-items");
    const totalEl = document.getElementById("checkout-total");
    if(box) box.innerHTML = "<p>Carrito vacío</p>";
    if(totalEl) totalEl.textContent = formatMoney(0);

    const badge = document.getElementById("cart-count");
    if(badge){
      badge.textContent = "0";
      badge.hidden = true;
    }

  }catch(e){
    const msg = String(e.message || "Error");

    if(msg.includes("NO_PAYMENT_METHOD")){
      setMsg("Seleccioná una tarjeta para continuar.", false);
    } else if(msg.includes("EMPTY_CART")){
      setMsg("El carrito está vacío.", false);
    } else if(msg.startsWith("OUT_OF_STOCK")){
      setMsg("Sin stock disponible.", false);
    } else {
      setMsg("No se pudo confirmar la compra.", false);
    }
  }finally{
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  loadCheckout();

  const btn = document.getElementById("confirm-checkout");
  if(btn) btn.addEventListener("click", confirmCheckout);

  const select = document.getElementById("card-select");
  if(select){
    select.addEventListener("change", () => {
      const btn = document.getElementById("confirm-checkout");
      if(!btn) return;
      btn.disabled = !select.value;
    });
  }
});