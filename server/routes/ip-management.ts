import { RequestHandler } from "express";
import { adminDB } from "@/server/lib/firebase-admin";
import { Timestamp, query, collection, where, getDocs } from "firebase-admin/firestore";

export interface IPBan {
  id: string;
  ipAddress: string;
  reason: string;
  bannedAt: any;
  expiresAt?: any;
}

export interface UserIP {
  id: string;
  userId: string;
  ipAddress: string;
  email: string;
  recordedAt: any;
  lastUsed: any;
}

export const handleCheckIPBan: RequestHandler = async (req, res) => {
  try {
    const { ipAddress } = req.body;

    if (!ipAddress) {
      res.status(400).json({ error: "IP address required" });
      return;
    }

    const bansRef = collection(adminDB, "ip_bans");
    const q = query(bansRef, where("ipAddress", "==", ipAddress));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      res.json({ banned: false });
      return;
    }

    const banDoc = snapshot.docs[0];
    const banData = banDoc.data() as IPBan;

    // Check if ban has expired
    if (banData.expiresAt) {
      const expiresAt = banData.expiresAt.toDate();
      if (new Date() > expiresAt) {
        // Ban has expired, delete it
        await banDoc.ref.delete();
        res.json({ banned: false });
        return;
      }
    }

    res.json({
      banned: true,
      reason: banData.reason,
      expiresAt: banData.expiresAt ? banData.expiresAt.toDate() : null,
    });
  } catch (error) {
    console.error("Error checking IP ban:", error);
    res.status(500).json({ error: "Failed to check IP ban" });
  }
};

export const handleCheckIPLimit: RequestHandler = async (req, res) => {
  try {
    const { ipAddress, maxAccounts } = req.body;

    if (!ipAddress || !maxAccounts) {
      res
        .status(400)
        .json({ error: "IP address and maxAccounts required" });
      return;
    }

    const ipsRef = collection(adminDB, "user_ips");
    const q = query(ipsRef, where("ipAddress", "==", ipAddress));
    const snapshot = await getDocs(q);

    const accountCount = snapshot.size;
    const isLimitExceeded = accountCount >= maxAccounts;

    res.json({
      accountCount,
      maxAccounts,
      isLimitExceeded,
    });
  } catch (error) {
    console.error("Error checking IP limit:", error);
    res.status(500).json({ error: "Failed to check IP limit" });
  }
};

export const handleRecordUserIP: RequestHandler = async (req, res) => {
  try {
    const { userId, email, ipAddress } = req.body;

    if (!userId || !ipAddress) {
      res.status(400).json({ error: "userId and ipAddress required" });
      return;
    }

    const ipDocRef = adminDB.collection("user_ips").doc();
    const now = Timestamp.now();

    await ipDocRef.set({
      userId,
      email: email || "",
      ipAddress,
      recordedAt: now,
      lastUsed: now,
    });

    res.json({ success: true, ipId: ipDocRef.id });
  } catch (error) {
    console.error("Error recording user IP:", error);
    res.status(500).json({ error: "Failed to record IP" });
  }
};

export const handleUpdateUserIPLogin: RequestHandler = async (req, res) => {
  try {
    const { userId, ipAddress } = req.body;

    if (!userId || !ipAddress) {
      res.status(400).json({ error: "userId and ipAddress required" });
      return;
    }

    const ipsRef = collection(adminDB, "user_ips");
    const q = query(ipsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    let found = false;
    for (const doc of snapshot.docs) {
      if (doc.data().ipAddress === ipAddress) {
        // Update last used
        await doc.ref.update({
          lastUsed: Timestamp.now(),
        });
        found = true;
        break;
      }
    }

    if (!found) {
      // Record new IP
      await adminDB.collection("user_ips").doc().set({
        userId,
        ipAddress,
        recordedAt: Timestamp.now(),
        lastUsed: Timestamp.now(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user IP login:", error);
    res.status(500).json({ error: "Failed to update IP login" });
  }
};
