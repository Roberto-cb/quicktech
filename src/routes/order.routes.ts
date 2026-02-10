import express from 'express';

import { verifyToken } from '../middlewares/auth.middleware';
import { postOrder, getOrdersMine,getOrdersAll, getOrder, postCheckout} from '../controllers/order.controller';


const router = express.Router();

router.post('/checkout',verifyToken,postCheckout);
router.post('/',verifyToken,postOrder);
router.get('/mine',verifyToken,getOrdersMine);
router.get('/:id',verifyToken,getOrder);

export default router;