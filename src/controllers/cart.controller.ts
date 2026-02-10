import { Request, Response } from "express";
import cartModel from "../models/cart";
import cartItemModel from "../models/cartItem";
import { checkoutFromCart, createOrder } from "../services/order.service";

import product from "../models/product";

const decToNumber = (v: any): number =>{
  if(v && typeof v === "object"  && "toNumber" in v) return v.toNumber();
  return Number(v);
}
// GET /cart -> carrito del usuario autenticado
export const getCart = async (req: Request, res: Response): Promise<void> => {
  const userId = Number((req as any).user?.id);
  
  if(!Number.isInteger(userId) || userId <=0){
    res.status(401).json({error: "No autorizado"});
    return;
  }

  try {
    const cart = await cartModel.findUnique({
      where: { user_id: userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      res.json({ items: [], totalEst: 0 });
      return;
    }

    //Detectar productos inactiovs en el carrito:

    const inactiveProductIds = cart.items
    .filter(it => !it.product.isActive)
    .map(it => it.product_id);

    //Eliminarlos automaticamente
    if(inactiveProductIds.length > 0){
      await cartItemModel.deleteMany({
        where: {
          cart_id: cart.id,
          product_id: {in: inactiveProductIds},
        }
      });
    }

    //Trabajar solo con items activos
    const activeItems = cart.items.filter(it => it.product.isActive);

    const items = activeItems.map((it) => {
  const price = decToNumber(it.product.price);
  return {
    productId: it.product_id,
    name: `${it.product.brand} ${it.product.model}`,
    image_url: it.product.image_url,
    price,
    quantity: it.quantity,
    lineTotal: price * it.quantity, // ✅ acá la corrección
  };
});

    const totalEst = items.reduce((acc, i) => acc + i.lineTotal, 0);
    res.json({ items, totalEst }); // <-- respondemos
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el carrito" });
  }
};

// POST /cart/items -> crear/actualizar un ítem { productId, quantity }
export const upsertCartItem = async (req: Request, res: Response): Promise<void> => {
  const userId = Number((req as any).user?.id);
  const { productId, quantity } = req.body as { productId?: number; quantity?: number };

  if(!Number.isInteger(userId) || userId <= 0){
    res.status(401).json({error: "No autorizado"});
    return;
  }
  
  // validaciones mínimas
  if (!Number.isInteger(productId) || (productId as number) <= 0) {
    res.status(400).json({ error: "productId inválido" });
    return;
  }
  if (!Number.isInteger(quantity) || (quantity as number) < 0 || (quantity as number) > 999) {
    res.status(400).json({ error: "quantity inválida" });
    return;
  }

  try {
    // asegurar carrito del usuario
    const cart = await cartModel.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
    });

    // si quantity = 0 -> eliminar ítem
    if (quantity === 0) {
      await cartItemModel.deleteMany({ where: { cart_id: cart.id, product_id: productId } });
      res.status(200).json({ removed: true }); // <-- corregido
      return;
    }
    
    const p = await product.findFirst({
      where: {id:productId!, isActive: true},
      select: {id:true},
    })

    if(!p) {
      res.status(404).json({error: "Producto no disponible"});
      return;
    }

    // upsert del item
    const item = await cartItemModel.upsert({
      where: { cart_id_product_id: { cart_id: cart.id, product_id: productId! } },
      update: { quantity: quantity! },
      create: { cart_id: cart.id, product_id: productId!, quantity: quantity! },
    });

    res.status(200).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el ítem del carrito" });
  }
};

// DELETE /cart/items/:productId -> eliminar un ítem
export const removeCartItem = async (req: Request, res: Response): Promise<void> => {
  const userId = Number((req as any).user?.id);
  const productId = Number(req.params.productId); // <-- corregido

  if(!Number.isInteger(userId) || userId <= 0){
    res.status(401).json({error: "No autorizado"});
    return;
  }
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: "productId inválido" });
    return;
  }

  try {
    const cart = await cartModel.findUnique({ where: { user_id: userId } });
    if (!cart) {
      res.status(200).json({ removed: true }); // idempotente
      return;
    }

    await cartItemModel.deleteMany({ where: { cart_id: cart.id, product_id: productId } });
    res.status(200).json({ removed: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el ítem del carrito" });
  }
};

// DELETE /cart -> vaciar carrito
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  const userId = Number((req as any).user?.id);

  if(!Number.isInteger(userId) || userId <= 0){
    res.status(401).json({error:"NO autorizado"});
    return;
  }
  try {
    const cart = await cartModel.findUnique({ where: { user_id: userId } });
    if (!cart) {
      res.status(200).json({ cleared: true });
      return;
    }
    await cartItemModel.deleteMany({ where: { cart_id: cart.id } });
    res.status(200).json({ cleared: true }); // <-- corregido
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo vaciar el carrito" });
  }
};

// POST /cart/checkout -> crear orden desde el carrito
export const checkoutCart = async (req: Request, res: Response): Promise<void> => {
  const userId = Number((req as any).user?.id);
  
  if(!Number.isInteger(userId) || userId <=0){
    res.status(401).json({error:"No autorizado"});
    return;
  }
  try {
    const order = await checkoutFromCart(userId);
    res.status(201).json(order);    
    
  } catch (error: any) {
    const msg = String(error.message || "ERROR");
      if (msg === "EMPTY_CART") {
      res.status(400).json({ message: "El carrito está vacío" });
      return;
    }
    if (msg.startsWith("OUT_OF_STOCK")) {
      res.status(409).json({ message: msg });
      return;
    }
    if (msg.startsWith("PRODUCT_NOT_FOUND")) {
      res.status(404).json({ message: msg });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Error en checkout" });
  }
};




export const mergeCart = async(req: Request, res: Response): Promise<void> =>{
  const userId = Number((req as any).user?.id);
  const items = req.body?.items as Array<{productId?:number; quantity?: number}>;

  if(!Number.isInteger(userId) || userId <= 0){
    res.status(401).json({error: "No autorizado"});
    return;
  }

  if(!Array.isArray(items)){
    res.status(400).json({error: "items invalidos"});
    return;
  }

  //validar y limpiar input

  const cleanItems = items
  .map((it)=>({
    productId: Number(it.productId),
    quantity: Number(it.quantity),
  }))
  .filter(
   (it) =>
    Number.isInteger(it.productId) && 
   it.productId > 0 &&
   Number.isInteger(it.quantity) &&
   it.quantity > 0 &&
   it.quantity <= 999
  );

  if(cleanItems.length === 0){
    res.status(200).json({merged: false, message: "Nada para mergear"});
    return;
  }

  try{
    const cart = await cartModel.upsert({
      where: {user_id: userId},
      update: {},
      create: {user_id: userId},
    });

    const existingItems = await cartItemModel.findMany({
      where: { cart_id: cart.id},
      select: {product_id: true, quantity: true},
    });
   //
    const existingMap = new Map(
      existingItems.map((i) => [i.product_id, i.quantity])
    );

    const ids = [...new Set(cleanItems.map( i => i.productId))];

    const active = await product.findMany({
      where: { id: {in:ids}, isActive: true},
      select:{id:true},
    })

    const activeSet = new Set(active.map(p => p.id));
    const filteredItems = cleanItems.filter(it => activeSet.has(it.productId));

    if(filteredItems.length === 0){
      res.status(200).json({merged: false, message: " No hay productos disponibles"});
      return;
    }

    for(const it of filteredItems){
      const currentQty = existingMap.get(it.productId) ?? 0;
      const finalQty = Math.min(999,currentQty + it.quantity);

      await cartItemModel.upsert({
        where: {
          cart_id_product_id: {
            cart_id: cart.id,
            product_id: it.productId,
          },
        },
        update: {quantity: finalQty},
        create: {
          cart_id: cart.id,
          product_id: it.productId,
          quantity: finalQty,
        }
      });
    }
    res.status(200).json({merged: true});
  }catch(error){
    console.error("Error mergeando carrito: ", error);
    res.status(500).json({error: "Error al mergear el carrito"})
  }


};