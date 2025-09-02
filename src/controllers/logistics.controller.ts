// logisticsPricing.ts
import { NextFunction, Request, Response } from "express";
import { addressSchema } from "../lib/zod/schema";
import { prisma } from "../config";
import { getGeocode } from "../helper/logistics";

// Hardcoded Ikeja base location
const BASE = {
  lat: 6.59692,
  lng: 3.35148,
  address: "7 Seidu Ajibowu St",
  lga: "Ikeja",
  state: "Lagos",
};

// Haversine distance calculation
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const r = (v: number) => (v * Math.PI) / 180;
  const dLat = r(lat2 - lat1),
    dLng = r(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Tiered pricing function
function getPrice(lat: number, lng: number, km: number): number {
  // Island premium rectangle
  const islandZone = { latMin: 6.42, latMax: 6.62, lngMin: 3.35, lngMax: 3.6 };

  if (km <= 15) {
    if (
      lat >= islandZone.latMin &&
      lat <= islandZone.latMax &&
      lng >= islandZone.lngMin &&
      lng <= islandZone.lngMax
    ) {
      return Math.min(4000 + Math.ceil(km) * 100, 8000);
    }
    return Math.min(2500 + Math.ceil(km) * 200, 4000);
  }

  if (km <= 100) {
    return 5000; // e.g., Ibadan, nearby towns
  }

  if (km <= 350) {
    return 6500; // e.g., Akure, Ilorin, Ondo
  }

  if (km <= 600) {
    return 8000; // e.g., Benin, Enugu, Owerri
  }

  return 10000; // Nationwide max cap (far north, NE, etc.)
}

export const logisticsPricing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { streetAddress, lga, state } = req.query;
    const addr = addressSchema.parse({ streetAddress, lga, state });

    const fullAddr = `${addr.streetAddress}, ${addr.lga}, ${addr.state}`;
    const geo = await getGeocode(fullAddr);

    if (geo.status !== "success" || !geo.data)
      throw new Error("Geocode failed");

    const { lat, lng } = geo.data;
    const km = haversine(BASE.lat, BASE.lng, lat, lng);
    const price = getPrice(lat, lng, km);

    res.json({
      message: "Price computed",
      data: {
        price,
        distanceKm: +km.toFixed(1),
        lat,
        lng,
        from: {
          ...BASE,
        },
        to: {
          address: addr.streetAddress,
          lga: addr.lga,
          state: addr.state,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logisticsTracking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber) {
      res.status(400).json({ error: "Order number is required" });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const deliveryType = order.deliveryType;
    let fullAddr = "";
    if (deliveryType == "terminal") {
      fullAddr = order.terminalAddress!;
    } else if (deliveryType == "home") {
      fullAddr = `${order.buyerAddress}, ${order.buyerLga}, ${order.buyerState}`;
    }
    const geo = await getGeocode(fullAddr);
    if (geo.status !== "success" || !geo.data)
      throw new Error("Geocode failed");

    const { lat, lng } = geo.data;

    res.status(200).json({
      message: "Logistics tracking info",
      data: {
        base: {
          latitude: BASE.lat,
          longitude: BASE.lng,
          address: BASE.address,
          lga: BASE.lga,
          state: BASE.state,
        },
        buyer: {
          latitude: lat,
          longitude: lng,
          terminalAddress: order.terminalAddress,
          address: order.buyerAddress,
          lga: order.buyerLga,
          state: order.buyerState,
          name: order.buyerName,
        },
        status: order.status,
        deliveryType,
      },
    });
  } catch (err) {
    next(err);
  }
};

//SUPPLIER OR ADMIN FUNCTION
// export const requestDelivery = async (req: Request, res: Response) => {
//   try {
//     const { orderId } = req.body;
//     const order = await prisma.order.findUnique({
//       where: { id: orderId },
//       include: {
//         supplier: {
//           select: {
//             businessName: true,
//             phone: true,
//             pickupLocation: {
//               select: {
//                 streetAddress: true,
//                 lga: true,
//                 state: true,
//                 latitude: true,
//                 longitude: true,
//               },
//             },
//           },
//         },
//         // ORDER ITEMS TO PICK
//         orderItems: {
//           select: {
//             productId: true,
//             productName: true,
//             quantity: true,
//             productSize: true,
//             productColor: true,
//             variantSize: true,
//             variantColor: true,
//             variantId: true,
//             // product: {
//             //   select: {
//             //     category: true,
//             //   }
//             // },
//           },
//         },
//       },
//     });
//     if (!order) {
//        res.status(404).json({ error: "Order not found!" });
//        return;
//     }
//     // const supplierLocation = order.supplier.pickupLocation;

//     // const PICKUP_ADDRESS = supplierLocation.streetAddress + ", " + supplierLocation.lga + ", " + supplierLocation.state;
//     const DELIVERY_ADDRESS = order.buyerAddress + ", " + order.buyerLga + ", " + order.buyerState;
//     // const SUPPLIER_LATITUDE = supplierLocation.latitude;
//     // const SUPPLIER_LONGITUDE = supplierLocation.longitude;
//     const BUYER_LATITUDE = order.buyerLatitude;
//     const BUYER_LONGITUDE = order.buyerLongitude;

//     //so if it is pay on delivery payment method, we tell logistics to request payment and we tell logistics order item to pickup
//     const body = {
//       CLIENT_NAME: "",
//       CLIENT_PHONE: "",
//       RECIPIENTS_NAME: order.buyerName,
//       RECIPIENTS_PHONE: order.buyerPhone,
//       REQUEST_TIME: new Date().toISOString(),
//       PICKUP_ADDRESS: "",
//       DELIVERY_ADDRESS: DELIVERY_ADDRESS,
//       COST: order.deliveryFee,
//       PAYMENT_METHOD: order.paymentMethod,
//       PICKUP_COORDINATES: [SUPPLIER_LONGITUDE, SUPPLIER_LATITUDE],
//       DELIVERY_COORDINATES: [BUYER_LONGITUDE, BUYER_LATITUDE],
//       DISPATCH_CATEGORY: "GROCERIES",
//     };

//     const response = await fetch(`${logisticsBaseUrl}/api/v1/requestdapi`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });
//     if (!response.ok) {
//       console.error("Logistics request failed");
//       throw new Error("Failed to request logistics service");
//     }
//     const { tracking_id } = await response.json();
//     await prisma.order.update({
//       where: { id: orderId },
//       data: { deliveryTrackingId: tracking_id },
//     });
//      res.status(200).json({
//       message: "Logistics service requested successfully!",
//       data: {
//         trackingId: tracking_id
//       },
//     });
//   } catch (err) {
//     console.error("Error in requestDelivery:", err);
//      res
//       .status(500)
//       .json({ error:"Internal server error!" });
//   }
// };

// export const logisticsPricing = async (req: Request, res: Response) => {
//   try {
//     const { streetAddress, lga, state} = req.query;
//     const addrInput = {
//       streetAddress: String(streetAddress || ""),
//       lga: String(lga || ""),
//       state: String(state || ""),
//     };
//     const addrParse = addressSchema.safeParse(addrInput);
//     if (!addrParse.success) {
//       res.status(400).json({ error: "Invalid field data!" });
//       return;
//     }

//     //Geocode customer address
//     const fullAddress = `${addrParse.data.streetAddress}, ${addrParse.data.lga}, ${addrParse.data.state}`;
//     const geoCode = await getGeocode(fullAddress);
//     if (geoCode.status !== "success" || !geoCode.data) {
//       throw new Error(`Geocoding failed for customer address: ${fullAddress}`);
//     }
//     const { lat: buyerLat, lng: buyerLng } = geoCode.data;

//     // const body = {
//     //   PICKUP_COORDINATES: [supLng, supLat],
//     //   DELIVERY_COORDINATES: [buyerLng, buyerLat],
//     // };
//     // const response = await fetch(`${logisticsBaseUrl}/api/v1/getdelcp`, {
//     //   method: "POST",
//     //   headers: { "Content-Type": "application/json" },
//     //   body: JSON.stringify(body),
//     // });
//     // if (!response.ok) {
//     //   console.error("getdelcp api error");
//     //   throw new Error("Failed to get logistics pricing");
//     // }
//     const {price} = await response.json();
//       res.status(200).json({
//         message: "Logistics pricing fetched successfully!",
//         data: {
//           price,
//           latitude: buyerLat,
//           longitude: buyerLng,
//         },
//       });
//   } catch (err) {
//     console.error("Error in logisticsPricing:", err);
//     res.status(500).json({ error: "Internal server error!" });
//   }
// };
