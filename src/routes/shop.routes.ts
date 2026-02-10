import { Router } from "express";
import { getCatalog } from "../controllers/shop.controller";
import {renderProductDetail} from "../controllers/product.controller"

const router = Router();
router.get("/", getCatalog); 
router.get("/product/:id", renderProductDetail);
router.get("/checkout", (req, res) => {
  return res.render("shop/checkout", { title: "Checkout" });
});
export default router;