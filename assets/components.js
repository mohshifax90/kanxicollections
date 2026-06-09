/* ── KANXI SHARED CART ── */
function useLocalCart() { return !(window.Store && Store.useLocalStorage === false); }
function getCart() {
  if (useLocalCart()) return JSON.parse(localStorage.getItem('kanxi_cart') || '[]');
  return window._kanxiCart || [];
}
function saveCart(cart) {
  if (useLocalCart()) localStorage.setItem('kanxi_cart', JSON.stringify(cart));
  else window._kanxiCart = cart;
  updateCartCount();
}
function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id && i.size === product.size);
  if (existing) existing.qty += (product.qty || 1);
  else cart.push({ ...product, qty: product.qty || 1 });
  saveCart(cart);
  showToast((product.name || 'Item') + ' added to bag');
}
function activeCartPrice(item) {
  if (!(window.Store && item && item.id)) return item.price || 0;
  const rawId = String(item.id || '');
  const [productId, variantId] = rawId.split('_');
  const product = Store.get('products', productId);
  if (!product) return item.price || 0;
  return variantId ? (Store.priceOfVariant(productId, variantId) || Store.priceOf(product) || item.price || 0)
    : (Store.priceOf(product) || item.price || 0);
}
function refreshCartPrices() {
  const cart = getCart();
  let changed = false;
  cart.forEach(item => {
    const next = activeCartPrice(item);
    if (Number(item.price || 0) !== Number(next || 0)) {
      item.price = next;
      changed = true;
    }
  });
  if (changed) saveCart(cart);
  return cart;
}
function updateCartCount() {
  const c = refreshCartPrices().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-dot, .cart-count').forEach(el => {
    el.textContent = c;
    el.style.display = c > 0 ? 'flex' : 'none';
  });
}
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
document.addEventListener('DOMContentLoaded', updateCartCount);
