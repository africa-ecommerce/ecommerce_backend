// src/controllers/marketplace.controller.ts
import { Request, Response } from "express";
import {
  listMerchants,
  listMarketplaceProducts,
} from "../services/marketplace.service";

export const getMerchants = async (req: Request, res: Response) => {
  try {
    const { category, location } = req.query;
    const merchants = await listMerchants({
      category: category as string,
      location: location as string,
    });
    res.json({ merchants });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getMarketplaceProducts = async (req: Request, res: Response) => {
  try {
    const { category, keyword } = req.query;
    const products = await listMarketplaceProducts({
      category: category as string,
      keyword: keyword as string,
    });
    res.json({ products });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
