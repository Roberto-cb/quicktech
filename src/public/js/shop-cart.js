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