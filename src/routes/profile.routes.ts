import { Router } from "express";


const router = Router();


router.get('/',(req,res)=>{
    if(!res.locals.user) return res.redirect('/auth/login');
    res.render("profile/index",{title:"Mi perfil"})
});

export default router;