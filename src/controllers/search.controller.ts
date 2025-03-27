// src/controllers/search.controller.ts
import { Request, Response } from "express";
import { searchProducts, searchMerchants } from "../services/search.service";

export const productSearch = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q)
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    const results = await searchProducts(q as string);
    res.json({ results });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};





export const merchantSearch = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q)
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    const results = await searchMerchants(q as string);
    res.json({ results });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
