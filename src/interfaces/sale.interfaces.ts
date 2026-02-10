export interface Sale {
  id: number | string;  // Puede ser UUID o INT
  user_id: number | string;  // Relación con el usuario que realizó la compra
  total: number;  // Precio total de la venta
  date: Date;  // Fecha y hora de la compra
}