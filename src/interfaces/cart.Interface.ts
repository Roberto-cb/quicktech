import { ICartItem } from "./cartItem.interface";
export interface ICart {
  id: number;
  user_id: number;
  updated_at: Date;
  items?: ICartItem[];
}