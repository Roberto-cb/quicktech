import express from 'express'
import {verifyToken, checkRole} from "../middlewares/auth.middleware"
import { updateUser, createUser,getUserById,getAll,deleteUser } from '../controllers/user.controller';


const router = express.Router()



router.post('/',verifyToken,createUser);
router.get('/',verifyToken,getAll);
router.get('/:id',verifyToken,getUserById);
router.put('/:id',verifyToken,updateUser);
router.delete('/:id',verifyToken,deleteUser);


export default router;