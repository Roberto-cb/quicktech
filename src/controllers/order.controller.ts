import { Request, Response } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  listAllOrders,
  checkoutFromCart
} from "../services/order.service";

// controllers/order.controller.ts


export const postOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number((req as any).user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "No hay items" });
      return;
    }
    for (const it of items) {
      if (
        !it ||
        !Number.isInteger(it.productId) || it.productId <= 0 ||
        !Number.isInteger(it.quantity) || it.quantity <= 0
      ) {
        res.status(400).json({ message: "Formato de items inválido" });
        return;
      }
    }

    const order = await createOrder(userId, items);
    res.status(201).json(order);
  } catch (error: any) {
    const msg = String(error.message || "ERROR");
    if (msg.startsWith("OUT_OF_STOCK")) { res.status(409).json({ message: msg }); return; }
    if (msg.startsWith("PRODUCT_NOT_FOUND")) { res.status(404).json({ message: msg }); return; }
    if (msg === "EMPTY_ITEMS") { res.status(400).json({ message: "No hay items" }); return; }
    res.status(500).json({ message: "Error al crear la orden" });
  }
};

export const getOrdersMine = async (req: Request, res: Response): Promise<void> => {
  const userId = Number((req as any).user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const data = await getMyOrders(userId, page, pageSize);
  res.json(data);
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: "Id inválido" });
    return;
  }

  const order = await getOrderById(id);
  if (!order) { res.status(404).json({ message: "Orden no encontrada" }); return; }

  const user = (req as any).user;
  const isOwner = order.user_id === Number(user?.id);
  const isAdmin = user?.role === "admin";
  if (!isOwner && !isAdmin) { res.status(403).json({ message: "Forbidden" }); return; }

  res.json(order);
};

// OJO: si querés exponer este endpoint, agregá la ruta con checkRole('admin') en order.routes.ts
export const getOrdersAll = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const data = await listAllOrders(page, pageSize);
  res.json(data);
};

export const postCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number((req as any).user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    // ✅ Requerir método de pago (demo: viene del LocalStorage)
    const { cardId } = (req.body ?? {}) as { cardId?: string };

    if (typeof cardId !== "string" || !cardId.trim()) {
      res.status(400).json({ message: "NO_PAYMENT_METHOD" });
      return;
    }

    const order = await checkoutFromCart(userId);

    res.status(201).json({
      ...order,
      cardId,
    });
  } catch (error: any) {
    console.error("🔥 /orders/checkout ERROR:", error);
    const msg = String(error?.message || "ERROR");

    if (msg === "EMPTY_CART") { res.status(400).json({ message: "EMPTY_CART" }); return; }
    if (msg.startsWith("OUT_OF_STOCK")) { res.status(409).json({ message: msg }); return; }
    if (msg.startsWith("PRODUCT_NOT_FOUND")) { res.status(404).json({ message: msg }); return; }
    if (msg === "EMPTY_ITEMS") { res.status(400).json({ message: "EMPTY_ITEMS" }); return; }

    res.status(500).json({ message: "Error al confirmar la compra", error: msg });
  }
};