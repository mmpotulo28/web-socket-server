require("dotenv").config({ path: ".env.local" });
const http = require("http");
const { Server } = require("socket.io");
const { insertBid, fetchBidsByItemId, subscribeToBids } = require("./db");

const server = http.createServer();
const io = new Server(server, {
	cors: {
		origin: "*", // Allow connections from external websites
		methods: ["GET", "POST"],
	},
});

// Create a namespace for /auction
const auctionNamespace = io.of("/auction");

// Global cache for all bids with a size limit
const MAX_CACHE_SIZE = 1000;
let allBidsCache = [];

// Subscribe to real-time bid changes
subscribeToBids((payload) => {
	const { eventType, new: newBid } = payload;

	if (eventType === "INSERT" && newBid) {
		// Update the global cache with a size limit
		if (allBidsCache.length >= MAX_CACHE_SIZE) {
			allBidsCache.shift(); // Remove the oldest bid
		}
		allBidsCache.push(newBid);

		// Broadcast the new bid to all clients
		auctionNamespace.emit("NEW_BID", newBid);
		console.log("Broadcasting new bid:", newBid);
	}
});

auctionNamespace.on("connection", (socket) => {
	console.log("Client connected to /auction:", socket.id);

	// Send cached bids privately to the newly connected socket
	socket.emit("CACHED_BIDS", { id: socket.id, bids: allBidsCache });

	// Handle bid history request
	socket.on("FETCH_BID_HISTORY", async ({ itemId }) => {
		try {
			const bids = await fetchBidsByItemId(itemId);
			socket.emit("BID_HISTORY", bids);
		} catch (error) {
			socket.emit("BID_ERROR", { message: "Failed to fetch bid history" });
		}
	});

	// Handle new bids
	socket.on("PLACE_BID", async (data) => {
		const { itemId, amount, userId, timestamp } = data;

		if (!itemId || !amount || !userId || !timestamp) {
			socket.emit("BID_ERROR", { message: "Invalid bid data" });
			return;
		}

		const bid = { itemId, amount, userId, timestamp };

		// Broadcast the bid immediately
		auctionNamespace.emit("NEW_BID", bid);
		console.log(`Broadcasting new bid for item ${itemId}: $${amount} by user ${userId}`);

		// Add the bid to the batch for database insertion
		try {
			await insertBid(bid);
		} catch (error) {
			console.error("Error adding bid to batch:", error);
			socket.emit("BID_ERROR", { message: "Failed to process bid" });
		}
	});

	socket.on("disconnect", () => {
		console.log("Client disconnected from /auction:", socket.id);
	});
});

const PORT = process.env.PORT || 4200;
server.listen(PORT, () => {
	console.log(`Auction WebSocket server running on port ${PORT}`);
});
