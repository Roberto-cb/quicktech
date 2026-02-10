export interface SaleDetail {
  id: number | string;  // Puede ser UUID o INT
  sale_id: number | string;  // Relación con la venta
  product_id: number | string;  // Relación con el producto
  quantity: number;  // Cantidad del producto comprado
  subtotal: number;  // Subtotal: precio * cantidad
}