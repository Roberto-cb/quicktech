// Estas variables deben estar accesibles para la función
const modal = document.querySelector("#guest-cart-modal");
const modalItems = document.querySelector("#guest-cart-items");
const modalTotal = document.querySelector("#guest-cart-total");

/* ============================================================
   QT_SHOP_CART.JS - Lógica de LocalStorage
   ============================================================ */
const GUEST_CART_KEY = "qt_cart_guest";

function getGuestCart() {
    try {
        return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || [];
    } catch { return []; }
}

function setGuestCart(items) {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function guestCartCount() {
    return getGuestCart().reduce((acc, item) => acc + (item.quantity || 0), 0);
}

function guestCartTotal() {
    return getGuestCart().reduce(
        (acc, item) => acc + Number(item.price) * (item.quantity || 0),
        0
    );
}

// Pasamos una función 'onUpdate' para avisar que algo cambió.
function addToGuestCart(product, delta, onUpdate) {
    const cart = getGuestCart();
    const index = cart.findIndex((p) => p.productId === product.productId);

    if (index >= 0) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) cart.splice(index, 1);
    } else if (delta > 0) {
        cart.push({ ...product, quantity: delta });
    }

    setGuestCart(cart);

    // Si pasamos una función de aviso, la ejecutamos
    if (typeof onUpdate === 'function') onUpdate();
}


async function mergeGuestCartIfLogged(){
    if(typeof isLogged !== 'function' || !isLogged()) return;

    const guest = getGuestCart();
    if(!Array.isArray(guest) || guest.length === 0) return;

    const items = guest
    .map((it)=>({
     productId:  Number(it.productId),
     quantity: Number(it.quantity || 0),
    }))
    .filter((it)=> it.productId > 0 && it.quantity > 0 );

    if(!items.length) return;

    try{
        const res = await fetch('/cart/merge',{
            method: 'POST',
            headers:{"Content-Type" : "application/json"},
            credentials: "include",
            body: JSON.stringify({items})  
        });

        if(res.ok){
            // 1. Limpiamos el carrito temporal (Guest)
            localStorage.removeItem(GUEST_CART_KEY);
            
            // 2. Avisamos a la interfaz que debe redibujarse con los datos del usuario
            // Verificamos que la función 'handleCartUpdateUI' exista en shop.js
            if(typeof handleCartUpdateUI === 'function') {
                await handleCartUpdateUI();
            } else if(typeof fetchUserCartAPI === 'function') {
                // Si no existe la de UI, al menos actualizamos los datos de la API
                await fetchUserCartAPI();
            }
            
            console.log("✅ Merge exitoso: Carrito local migrado a la cuenta del usuario.");
        }
    } catch(err){
        console.error('Merge guest cart fallo: ', err);
    } 
}

function renderGuestCart() {
  if (!modalItems || !modalTotal) return;
  const items = getGuestCart();
  //caso del carrito vacio:
  if (!items.length) {
    modalItems.innerHTML = "<p>Carrito vacío.</p>";
    modalTotal.textContent = formatPrice(0);
    return;
  }
 //Generarom un html 
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

  //Actualizamos el total
  modalTotal.textContent = formatPrice(guestCartTotal());
  if (modal && !modal.hidden && typeof positionCartDropdown === "function") {
    positionCartDropdown();
  }
}