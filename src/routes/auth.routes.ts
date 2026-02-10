import express from 'express';
import { register, login , logout, renderForgotPassword,forgotPassword,renderResetPassword,resetPassword} from '../controllers/auth.controller';

const router = express.Router();

router.get('/login', (req, res) => res.render('auth/login'));
router.get('/register', (req, res) => res.render('auth/register'));

router.get('/forgot-password', renderForgotPassword);
router.post('/forgot-password', forgotPassword);

router.get('/reset-password', renderResetPassword);
router.post('/reset-password', resetPassword);

router.post('/register',register);
router.post('/login',login );
router.post('/logout',logout);

export default router;