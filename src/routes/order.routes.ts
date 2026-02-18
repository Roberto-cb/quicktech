import express from 'express';

import { verifyToken } from '../middlewares/auth.middleware';
import { postOrder, getOrdersMine,getOrdersAll, getOrder, postCheckout} from '../controllers/order.controller';


const router = express.Router();

router.post('/checkout',verifyToken,postCheckout);

router.get('/mine',verifyToken,getOrdersMine);
router.get('/:id',verifyToken,getOrder);
router.post('/',verifyToken,postOrder);

router.get('/', verifyToken, getOrdersAll);
export default router;