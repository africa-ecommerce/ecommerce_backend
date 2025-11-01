import { prisma } from "../config";
import { Response, Request, NextFunction } from "express";
import { AuthRequest } from "../types";
import path from "path";
import { customAlphabet } from "nanoid";
import { currentUser } from "../helper/helperFunc";
import { errorMail } from "../helper/mail/dev/errorMail";

/**
 * Generate a short link for both Plug and Supplier users.
 */
export async function generateShortLink(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { shareUrl } = req.body;
    if (!shareUrl || typeof shareUrl !== "string") {
      res.status(400).json({ error: "Missing or invalid field data!" });
      return;
    }

    const { type, id } = currentUser(req); // 🧩 unified helper
    const targetUrl = shareUrl.trim();

    // 🔹 Check if a link already exists for this target + owner
    const existing = await prisma.link.findFirst({
      where: {
        targetUrl,
        ...(type === "PLUG" ? { plugId: id } : { supplierId: id }),
      },
    });

    if (existing) {
      res.status(200).json({
        link: `https://pluggn.store/${existing.shortId}`,
      });
      return;
    }

    // 🔹 Generate shortId
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const nanoid = customAlphabet(alphabet, 7);
    const shortId = nanoid();

    // 🔹 Create link dynamically based on user type
    const newLink = await prisma.link.create({
      data: {
        targetUrl,
        shortId,
        ...(type === "PLUG" ? { plugId: id } : { supplierId: id }),
      },
    });

    res.status(201).json({
      link: `https://pluggn.store/${newLink.shortId}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public link handler (unchanged)
 */
export async function linkHandler(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const m =
      typeof req.query.m === "string" ? req.query.m.toUpperCase() : "UNKNOWN";

    if (!slug) {
      res.status(400).json({ error: "Missing or invalid field data!" });
      return;
    }

    // 🔹 Map platform initials
    let platformName;
    switch (m) {
      case "W":
        platformName = "whatsApp";
        break;
      case "I":
        platformName = "instagram";
        break;
      case "F":
        platformName = "facebook";
        break;
      case "T":
        platformName = "twitter";
        break;
      case "TT":
        platformName = "tiktok";
        break;
      case "D":
        platformName = "direct";
        break;
      default:
        platformName = "Unknown";
    }

    const link = await prisma.link.findUnique({
      where: { shortId: slug },
      select: { targetUrl: true, id: true },
    });

    if (!link) {
      res
        .status(404)
        .sendFile(path.join(__dirname, "../../public/templates/primary/404.html"));
      return;
    }

    // 🔹 Bot detection
    const BOT_KEYWORDS = [
      "bot",
      "crawl",
      "spider",
      "facebookexternalhit",
      "twitterbot",
      "linkedinbot",
      "tiktokbot",
      "youtube",
    ];
    const userAgent = req.get("user-agent")?.toLowerCase() || "";
    const isBot = BOT_KEYWORDS.some((keyword) => userAgent.includes(keyword));

    if (!isBot) {
      await prisma.linkAnalytics.upsert({
        where: { linkId_platform: { linkId: link.id, platform: platformName } },
        update: { clicks: { increment: 1 } },
        create: { linkId: link.id, platform: platformName, clicks: 1 },
      });
    }

    let redirectUrl = link.targetUrl;
    if (platformName !== "Unknown") {
      redirectUrl = `${redirectUrl}${"&"}platform=${encodeURIComponent(platformName)}`;
    }

    res.redirect(decodeURIComponent(redirectUrl));
  } catch (err) {
    console.error("Link handler error:", err);
    try {
      await errorMail(req, err);
    } catch (mailErr) {
      console.error("Failed to send global error email:", mailErr);
    }
    res
      .status(500)
      .sendFile(path.join(__dirname, "../../public/templates/primary/error.html"));
  }
}
