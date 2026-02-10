import { Request, Response } from "express";

export const getCatalog = (_req: Request, res: Response) => {
  res.render("shop/home", { title: "QuickTech | Catálogo" });
};