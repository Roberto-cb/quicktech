// public/js/checkout.js

function formatMoney(n) {
    const x = Number(n);
    return `$${x.toFixed(2)}`;
}

function setMsg(text, ok = true) {
    const msg = document.getElementById("checkout-msg");
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = ok ? "lightgreen" : "salmon";
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    // 🛡️ Candado de seguridad:
    if (res.status === 401) {
        window.location.href = "/auth/login?expired=true";
        return {};
    }

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg = json?.message || json?.error || "ERROR";
        throw new Error(msg);
    }
    return json.data ?? json.items ?? json.payload ?? json;
}

/* ============================
   Tarjetas fake (LocalStorage)
   ============================ */

function getCardsKey() {
    const uid = document.body.getAttribute("data-userid") || "guest";
    return "qt_cards_" + uid;
}

function readCards() {
    try {
        return JSON.parse(localStorage.getItem(getCardsKey()) || "[]");
    } catch {
        return [];
    }
}

function maskNumber(n) {
    const digits = String(n || "").replace(/\D/g, "");
    return digits.replace(/.(?=.{4})/g, "•").replace(/(.{4})/g, "$1 ").trim();
}

function loadCardsIntoSelect() {
    const select = document.getElementById("card-select");
    if (!select) return;

    select.innerHTML = `<option value="" selected disabled>— Seleccioná una tarjeta —</option>`;

    const cards = readCards();
    if (!cards.length) return;

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

function renderCart(cart) {
    const box = document.getElementById("checkout-items");
    const totalEl = document.getElementById("checkout-total");
    const btn = document.getElementById("confirm-checkout");

    if (!box || !totalEl || !btn) return;

    const items = Array.isArray(cart.items) ? cart.items : [];
    const totalEst = Number(cart.totalEst || 0);

    if (!items.length) {
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
}

async function loadCheckout() {
    try {
        loadCardsIntoSelect();
        const res = await fetch("/cart", { headers: { Accept: "application/json" } });

        if (res.status === 401) {
            window.location.href = "/auth/login?expired=true";
            return;
        }
        const json = await res.json();
        const items = json.data ?? json.items ?? json;
        const totalEst = json.totalEst || (json.data && json.data.totalEst) || 0;

        renderCart({ items, totalEst });

        const cards = readCards();
        if (!cards.length) {
            const btn = document.getElementById("confirm-checkout");
            if (btn) btn.disabled = true;
            setMsg("No tenés tarjetas guardadas. Agregá una en tu perfil.", false);
        }
    } catch (e) {
        console.error(e);
        setMsg("No se pudo cargar el carrito.", false);
    }
}

/* ============================
   Confirmar compra
   ============================ */

async function handleCheckout() {
    const btn = document.getElementById("confirm-checkout");
    const select = document.getElementById("card-select");
    const cardId = select?.value || "";

    if (!cardId) {
        Swal.fire('Atención', 'Tenés que seleccionar una tarjeta para continuar.', 'warning');
        return;
    }

    // 🛡️ DOBLE VALIDACIÓN (QA Point)
    const cards = readCards();
    const index = parseInt(cardId.replace("idx_", "")); // ✅ Corregido cardId

    if (isNaN(index) || !cards[index]) {
        Swal.fire({
            icon: 'error',
            title: 'Tarjeta no válida',
            text: 'La tarjeta seleccionada ya no existe. Por favor, elegí otra.',
            background: "#1a1a1a",
            color: '#ffffff'
        });
        loadCardsIntoSelect();
        btn.disabled = true;
        return;
    }

    const confirm = await Swal.fire({
        title: '¿Confirmar compra?',
        text: "Se procesará el pedido con la tarjeta seleccionada.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        confirmButtonText: 'Sí, comprar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    try {
        btn.disabled = true;
        btn.textContent = "Procesando...";
        setMsg("Generando Orden...");

        // Llamando a la API
        const order = await fetchJSON("/orders/checkout", { // Ajustado a tu ruta de órdenes
            method: "POST",
            body: JSON.stringify({ cardId: String(index) })
        });

        await Swal.fire({
            icon: 'success',
            title: '¡Compra exitosa!',
            text: `Tu orden #${order.id || order.payload?.id} ha sido generada.`,
            background: '#1a1a1a',
            color: '#ffffff',
            confirmButtonColor: '#28a745'
        });
        window.location.href = "/profile";
    } catch (err) {
        console.error("Error capturand:", err.message);
        
        let errorText = err.message;

        if(err.message.includes("PRODUCT_INACTIVE")){
            errorText = "Uno de los productos en tu carrito ya no esta disponible. El carrito se actualizara.";
            //Recargar el checkout para que el backedm limpie el item inactivo.
            setTimeout(() => window.location.reload(), 3000);
        }
        else if (err.message.includes("OUT_OF_STOCK")) {
            errorText = " Lo sentimos, uno de los productos se quedo sin stock suficiente.";
        }
        else if(err.message === "EMPTY_CART"){
            errorText = "Tu carrito esta vacio.";
        }
        Swal.fire({
            icon: 'error',
            title: 'No se pudo completar la compra',
            text: errorText,
            background: '#1a1a1a',
            color: '#ffffff'
        });

        
        
       btn.disabled = false;
       btn.textContent = "Confirmar compra";
    }
}

/* ============================
   Eventos
   ============================ */

document.addEventListener("DOMContentLoaded", () => {
    loadCheckout();
    document.getElementById("confirm-checkout")?.addEventListener("click", handleCheckout);

    document.getElementById("card-select")?.addEventListener("change", (e) => {
        const btn = document.getElementById("confirm-checkout");
        if (btn) btn.disabled = !e.target.value;
        setMsg("", true);
    });
});

window.addEventListener("storage", (event) => {
    if (event.key === getCardsKey()) {
        console.log("Sincronizando tarjetas...");
        loadCardsIntoSelect();
        const btn = document.getElementById("confirm-checkout");
        if (btn) btn.disabled = true;
        setMsg("Las tarjetas han cambiado. Por favor, seleccioná una nuevamente.", false);
    }
});