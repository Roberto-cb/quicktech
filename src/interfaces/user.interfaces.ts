
export interface User{
    //el tipo de usaurio que vamos a usar en toda nuestra aplicacion
    id:number | string;
    first_name:string;
    last_name:string;
    dni:string;
    email:string;
    password:string;
    age:number;
    role: 'client' | 'admin';
    state: string; //localidad
    city:string;
    street:string;
    street_number:string;
    postal_code:string;
    passwordResetTokenHash?: string | null;
    passwordResetExpiresAt?: Date | string | null;

}