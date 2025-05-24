import { Request, Response } from "express";
import { AuthRequest } from "../types";

const DASHSPID_BASE_URL = "https://api.dashspid.com";

export const getAddressSuggestions = async (req: AuthRequest, res: Response) => {
    const { searchTerm } = req.query;

    if (!searchTerm || typeof searchTerm !== 'string') {

        /**
         * @dev do res.status with message, then return. A return res.status causes typescript issues
         */
         res.status(400).json({ error: "Invalid search term" });
         return;
    }

    try {
      const response = await fetch(
        `${DASHSPID_BASE_URL}/api/v1/gasp?searchTerm=${encodeURIComponent(
          searchTerm
        )}`
      );

      if (!response.ok) {
        throw new Error("Failed get address suggestions");
      }
      const data = await response.json();

      /**
       * @dev do res.status with message, then return. A return res.status causes typescript issues
       */
      res.status(200).json(data);
      return;
    } catch (error) {
        console.error("Error fetching address suggestions:", error);

            /**
            * @dev do res.status with message, then return. A return res.status causes typescript issues
            */
         res.status(500).json({ error: "Internal server error" });
         return;
    }

} // get locations address
export const getGeocode = async (req: Request, res: Response) => {
    const { address, placeID } = req.query;

    if (!address && !placeID) {
         res.status(400).json({ error: "Address or Place ID is required" });
         return;
    }
    try {
        let url = `${DASHSPID_BASE_URL}/api/v1/ggcp?address=${encodeURIComponent(address as string)}+&placeId=${encodeURIComponent(placeID as string)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to fetch geocode");
        }
        const data = await response.json();

         res.status(200).json(data);
         return;
    } catch (error) {
        console.error("Error fetching geocode:", error);
         res.status(500).json({ error: "Internal server error" });
         return;
    }
} // get geolocation
export const getShippingRates = async (req: Request, res: Response) => {

} // get shipping rates

interface CreateShipmentInput {
    CLIENT_NAME: string;
    CLIENT_PHONE: string;
    RECIPIENTS_NAME: string;
    RECIPIENTS_PHONE: string;
    REQUEST_TIME: string;
    PICKUP_ADDRESS: string;
    DELIVERY_ADDRESS: string;
    COST: number;
    PICKUP_COORDINATES: number[];
    DELIVERY_COORDINATES: number[];
    DISPATCH_CATEGORY: string;
}

export const requestShipping = async (req: Request, res: Response) => {
    try {
        const response = await fetch(`${DASHSPID_BASE_URL}/api/v1/requestdapi`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error("Failed to request shipping");
        }

        const data = await response.json();
         res.status(200).json(data);
         return;
    } catch (error) {
        console.error("Error requesting shipping:", error);
         res.status(500).json({ error: "Internal server error" });
         return;
    }
} // request shipping
export const getShippingStatus = async (req: Request, res: Response) => { } // get shipping status / track shipment