import { Prisma, PrismaClient } from "@prisma/client";
import user from "../models/user";


const prisma = new PrismaClient();




export type OrderItem = { productId: number; quantity: number };
export type CreateOrderResult = { id: number; total: Prisma.Decimal; date: Date };

const normalizeItems = (items: OrderItem[]): OrderItem[] => {
  const map = new Map<number, number>();
  for (const it of items) {
    const q = map.get(it.productId) ?? 0;
    map.set(it.productId, q + it.quantity);
  }
  return Array.from(map.entries()).map(([productId, quantity]) => ({ productId, quantity }));
};

export const getMyOrders = async (userId: number, page = 1, pageSize = 10) => {
  page = Math.max(1, Number(page || 1));
  pageSize = Math.min(100, Math.max(1, Number(pageSize || 10)));

  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where: { user_id: userId },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
      include: {
        saleDetails: {
          include: { product: { select: { id: true, model: true, price: true } } },
        },
      },
    }),
    prisma.sale.count({ where: { user_id: userId } }),
  ]);
  return { items, total, page, pageSize };
};

export const getOrderById = async (id: number) => {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, first_name: true, last_name: true, email: true } },
      saleDetails: { include: { product: true } },
    },
  });
};

export const listAllOrders = async (page = 1, pageSize = 20) => {
  page = Math.max(1, Number(page || 1));
  pageSize = Math.min(100, Math.max(1, Number(pageSize || 20)));

  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
      include: { user: { select: { id: true, first_name: true, last_name: true, email: true } } },
    }),
    prisma.sale.count(),
  ]);
  return { items, total, page, pageSize };
};

const createOrderWithTx = async(
  tx: Prisma.TransactionClient,
  userId: number,
  items: OrderItem[]
): Promise<CreateOrderResult> =>{
 if(!items?.length) throw new Error("EMPTY_ITEMS");

 const merged = normalizeItems(items);
 const ids = merged.map((i) => i.productId);

 const products = await tx.product.findMany({
  where: { id: { in: ids }, isActive: true },
  select: {id: true, model: true, price: true, stock: true},
 });

 const byId = new Map(products.map((p) =>[p.id, p]));
 let total = new Prisma.Decimal(0);

 const details: Array<{ product_id: number; quantity: number; subtotal: Prisma.Decimal }> = [];

 for(const {productId, quantity} of merged){
  const p = byId.get(productId);
  if(!p) throw new Error(`PRODUCT_NOT_FOUND:${productId}`);

  const subtotal = p.price.mul(quantity);
  total = total.add(subtotal);
  details.push({product_id: productId,quantity,subtotal});
 }
 // ✅ 1) Crear la venta primero
 const sale = await tx.sale.create({
  data:{
    user_id: userId,
    total,
  }
 });
 // Crear los detalles con sale_id
 await tx.saleDetail.createMany({
  data: details.map((d)=> ({
    ...d,
    sale_id: sale.id,
  }))
 });

 //Descontar stock atomico

 for(const {productId, quantity} of merged){
  const updated = await tx.product.updateMany({
    where: {id: productId, isActive: true, stock: { gte: quantity } },
    data: {stock: {decrement:quantity} },
  });
  if(updated.count === 0){
    throw new Error(`OUT_OF_STOCK:${byId.get(productId)?.model ?? productId}`);
  }
 }
 return{id: sale.id, total: sale.total, date: sale.date}
};

export const createOrder = async (userId: number, items: OrderItem[]): Promise<CreateOrderResult> =>{
  return prisma.$transaction(async (tx)=>{
    return createOrderWithTx(tx,userId,items);
  })
}


export const checkoutFromCart = async (userId: number): Promise<CreateOrderResult> => {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { user_id: userId },
      include: {
        items: {
          include: { product: { select: { id: true, isActive: true } } },
        },
      },
    });

    const cartItems = cart?.items ?? [];
    if (!cartItems.length) throw new Error("EMPTY_CART");
    
    /*
    // 1) limpiar items inválidos (producto inexistente o inactivo)
    const invalidIds = cartItems
      .filter((it) => !it.product || !it.product.isActive)
      .map((it) => it.product_id);

    if (invalidIds.length > 0) {
      await tx.cartItem.deleteMany({
        where: { cart_id: cart!.id, product_id: { in: invalidIds } },
      });
    }
    */
    const itemsInactivos = cartItems.filter((it)=> !it.product || !it.product.isActive);

    if(itemsInactivos.length > 0){
      //En lugar de borrar y seguir, lanzamos un error especifico
      //usamos el ID del producto si no tenemos el nombre.
      const proId = itemsInactivos[0].product_id;
      throw new Error(`PRODUCT_INACTIVE:${proId}`);
    }
    // 2) Quedarnos solo con items validos(si paso el filtro anterior, todos son validos).
    const validItems: OrderItem[] = cartItems.map((it)=> ({
      productId: it.product_id,
      quantity: it.quantity,
    }));
    
    /*
    // 2) quedarnos solo con items válidos
    const validItems: OrderItem[] = cartItems
      .filter((it) => it.product && it.product.isActive)
      .map((it) => ({ productId: it.product_id, quantity: it.quantity }));

    if (!validItems.length) throw new Error("EMPTY_CART");
    */
    // 3) crear venta
    const sale = await createOrderWithTx(tx, userId, validItems);

    // 4) vaciar carrito
    await tx.cartItem.deleteMany({ where: { cart_id: cart!.id } });

    return sale;
  });
};


