import express from "express";
import { verifyToken, checkRole } from "../middlewares/auth.middleware";
import {
  createProduct,
  updateProduct,
  getAllProducts,
  getProductById,
  deleteProduct,
  importProductsFromExcel,
  getAllProductsAdmin,
  getProductByIdAdmin,
  setProductActive,
} from "../controllers/product.controller";
import { uploadExcel } from "../middlewares/uploadExcel.middleware";

const router = express.Router();

/* =========================
   ADMIN (rutas específicas primero)
   ========================= */

// Excel import (admin)
router.post(
  "/import-excel",
  verifyToken,
  checkRole("admin"),
  uploadExcel.single("excel"),
  importProductsFromExcel
);

// Admin list (incluye inactivos)
router.get("/admin", verifyToken, checkRole("admin"), getAllProductsAdmin);

// Admin get by id (incluye inactivos)
router.get("/admin/:id", verifyToken, checkRole("admin"), getProductByIdAdmin);

// Reactivar / desactivar
router.patch("/:id/active", verifyToken, checkRole("admin"), setProductActive);

// CRUD admin
router.post("/", verifyToken, checkRole("admin"), createProduct);
router.put("/:id", verifyToken, checkRole("admin"), updateProduct);
router.delete("/:id", verifyToken, checkRole("admin"), deleteProduct);

/* =========================
   PUBLIC
   ========================= */

router.get("/", getAllProducts);
router.get("/:id", getProductById);

export default router;



