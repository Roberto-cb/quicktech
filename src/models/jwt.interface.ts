export interface JwtPayload{
    id:number;
    email:string;
    role:'client' | 'admin';
    first_name: string;
}