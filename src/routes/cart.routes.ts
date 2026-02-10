import  express  from "express";
import { verifyToken } from '../middlewares/auth.middleware';
import { getCart, upsertCartItem, removeCartItem, clearCart, mergeCart} from "../controllers/cart.controller";


const router = express.Router();

router.get('/',verifyToken,getCart);
router.post('/items',verifyToken,upsertCartItem);
router.post('/merge', verifyToken,mergeCart);
router.delete('/items/:productId',verifyToken,removeCartItem);
router.delete('/',verifyToken,clearCart);
//router.post('/checkout',verifyToken,checkoutCart);


export default router;