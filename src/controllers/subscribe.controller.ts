import { AuthRequest } from "../types";
import {NextFunction, Response } from "express";
import { prisma } from "../config";
import stringSimilarity from "string-similarity";
/**
 * Subscribe a Plug to a Supplier
 */
export const subscribeToSupplier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { supplierId } = req.params;
    const plugId = req.plug?.id; 

    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!supplier) throw new Error("SUPPLIER_NOT_FOUND");

      const plug = await tx.plug.findUnique({
        where: { id: plugId },
      });
      if (!plug) throw new Error("PLUG_NOT_FOUND");

      // Guard: already subscribed
      if (plug.subscribedTo.includes(supplierId)) {
        throw new Error("ALREADY_SUBSCRIBED");
      }

      // Update both atomically
      const updatedPlug = await tx.plug.update({
        where: { id: plugId },
        data: { subscribedTo: { push: supplierId } },
      });

      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: { subscribers: { push: plugId } },
      });

      return { updatedPlug, updatedSupplier };
    });

     res.json({
      message: "Subscribed successfully!",
      plug: result.updatedPlug,
      supplier: result.updatedSupplier,
    });
  } catch (error: any) {
    if (error.message === "SUPPLIER_NOT_FOUND") {
       res.status(404).json({ message: "Invalid supplier!" });
       return;
    }
   
    if (error.message === "ALREADY_SUBSCRIBED") {
       res
        .status(409)
        .json({ message: "Already subscribed!" });
        return;
    }
     next(error);
  }
};

/**
 * Unsubscribe a Plug from a Supplier
 */
export const unsubscribeFromSupplier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { supplierId } = req.params;
    const plugId = req.plug?.id; // assumed set from auth middleware

    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!supplier) throw new Error("SUPPLIER_NOT_FOUND");

      const plug = await tx.plug.findUnique({
        where: { id: plugId },
      });
      if (!plug) throw new Error("PLUG_NOT_FOUND");

      // Guard: not subscribed
      if (!plug.subscribedTo.includes(supplierId)) {
        throw new Error("NOT_SUBSCRIBED");
      }

      // Prepare updated arrays
      const newSubscribedTo = plug.subscribedTo.filter(
        (id: any) => id !== supplierId
      );
      const newSubscribers = supplier.subscribers.filter((id: any) => id !== plugId);

      // Update both atomically
      const updatedPlug = await tx.plug.update({
        where: { id: plugId },
        data: { subscribedTo: newSubscribedTo },
      });

      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: { subscribers: newSubscribers },
      });

      return { updatedPlug, updatedSupplier };
    });

     res.json({
      message: "Unsubscribed successfully!",
      plug: result.updatedPlug,
      supplier: result.updatedSupplier,
    });

  } catch (error: any) {
    if (error.message === "SUPPLIER_NOT_FOUND") {
       res.status(404).json({ message: "Invalid supplier!" });
       return
    }
   
    if (error.message === "NOT_SUBSCRIBED") {
       res.status(400).json({ message: "Already unsubscribed!" });
       return;
    }
   next(error);
  }
};


/**
 * Get all supplier a plug is subscribed to 
 */
export const getSubscribedSuppliers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plugId = req.plug?.id;

    const plug = await prisma.plug.findUnique({
      where: { id: plugId },
      select: { subscribedTo: true },
    });

    // Reverse to put most recent at the front
    const supplierIds = [...(plug?.subscribedTo ?? [])].reverse();

    // Fetch suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: {
        id: true,
        businessName: true,
        avatar: true,
      },
    });

    // Preserve original order (reverse order of IDs)
    const orderedSuppliers = supplierIds
      .map((id) => suppliers.find((s) => s.id === id))
      .filter(Boolean);

     res.json({ data: orderedSuppliers });
  } catch (error) {
   next(error);
  }
};

/**
 * Get all Plugs subscribed to a Supplier
 */
export const getSupplierSubscribers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplierId = req.supplier?.id; 

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { subscribers: true },
    });


    // Reverse to put most recent at the front
    const plugIds = [...(supplier?.subscribers ?? [])].reverse();

    // Fetch plugs
    const plugs = await prisma.plug.findMany({
      where: { id: { in: plugIds } },
      select: {
        id: true,
        businessName: true,
        avatar: true,
      },
    });

    // Preserve original order
    const orderedPlugs = plugIds
      .map((id) => plugs.find((p) => p.id === id))
      .filter(Boolean);

     res.json({ data: orderedPlugs });
  } catch (error) {
    next(error);
  }
};




export const searchSuppliers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const businessName = (req.query.businessName as string)?.trim().toLowerCase();

    if (!businessName) {
       res.status(400).json({ error: "Please include business name!" });
       return;
    }

    const plugId = req.plug?.id;

    // Step 1: fetch candidates with insensitive partial match
   const suppliers = await prisma.supplier.findMany({
  where: {
    businessName: {
      contains: businessName,
      mode: "insensitive",
    },
  },
  select: {
    id: true,
    businessName: true,
    avatar: true,
    subscribers: true, // fetch the whole array
  },
  take: 10,
});

    if (suppliers.length === 0) {
       res.status(200).json({
        message: "No results matches your search",
        data: [],
      });
      return
    }

    // Step 2: rank results by similarity (closest match first)
   const ranked = suppliers
     .map((s) => ({
       supplierId: s.id,
       businessName: s.businessName,
       avatar: s.avatar,
       isSubscribed: plugId ? s.subscribers.includes(plugId) : false,
       similarity: stringSimilarity.compareTwoStrings(
         businessName,
         s.businessName.toLowerCase()
       ),
     }))
     .sort((a, b) => b.similarity - a.similarity)
     .map(({ similarity, ...rest }) => rest);

     res.status(200).json({
      message: "Results fetched successfully!",
      data: ranked,
    });
  } catch (err) {
    next(err);
  }
};