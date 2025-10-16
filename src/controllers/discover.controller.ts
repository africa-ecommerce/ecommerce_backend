
// create a discover products endpoint or controller that gives users 50 products in a stack for a 12 hour period.
// so this is it, the client first requests for 50 products that will be shown to the user for a 12 hour period, after 12 hours the client can request for another 50 products. this 50 products 
// should be given at random for now, not using (algorithms) just 50 random products from the product table but it should exclude the products that a plug has
// already added to their plugproduct database, so this should never be included in the random 50 products to give to the client. so when this 50 random products are requested they are saved
// in either another table in the database or my cache that i have already for 12Hrs, so that when the client requests for the products again within the 12 hour period they get the same 50 products, but after the
// 12hrs and the client requests, another 50 random products are given to the client. but if within the 12hrs the user add out of those product to themselves, it removes them out of the 50 products that were given to them. and also  always return to the client the time left out of the 12hrs
// to know what time is left or something like that. using a very efficient method or strategy or so

import { discoverCache, DiscoverStack } from "../helper/cache/discoverCache";
import { NextFunction, Response } from "express";
import { AuthRequest } from "../types";
import { prisma } from "../config";


export const discoverProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plug = req.plug!;
    const cacheKey = `discover_stack_${plug.id}`;

    // Check cache
  const cachedStack = discoverCache.get(cacheKey) as DiscoverStack | undefined;
    if (cachedStack) {
      // If found, return existing stack
       res.status(200).json({
        message: "Returning cached discover stack",
        createdAt: cachedStack.createdAt,
        products: cachedStack.products,
      });
      return;
    }

    // Fetch product IDs plug already has
    const plugProducts = await prisma.plugProduct.findMany({
      where: { plugId: plug.id },
      select: { originalId: true },
    });

    const excludedIds = plugProducts.map((p) => p.originalId);

    // Get 50 random products excluding those already in plug's inventory
    const products = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "Product"
      WHERE "id" NOT IN (${
        excludedIds.length > 0
          ? excludedIds.map((id) => `'${id}'`).join(",")
          : `' '`
      })
      ORDER BY RANDOM()
      LIMIT 50
    `);

    // Create stack object
    const stackData = {
      createdAt: new Date(),
      products,
    };

    // Save to cache for 12h
    discoverCache.set(cacheKey, stackData);

    // Return response
    res.status(200).json({
      message: "New discover stack created",
      createdAt: stackData.createdAt,
      products: stackData.products,
    });
  } catch (error) {
    next(error);
  }
};