export interface Product {
  id: number | string;  // Puede ser UUID o INT
  type: 'peripheral' | 'component';  // Tipo de producto
  category: string;  // Ej: 'teclado', 'procesador'
  brand: string;
  model: string;
  dimensions: { length: number; width: number; thickness: number };  // Dimensiones del producto
  price: number;
  image_url: string;
  features: string;  // Descripción extensa de las características
  stock?: number;  // Opcional, si lo deseas controlar en inventario
}