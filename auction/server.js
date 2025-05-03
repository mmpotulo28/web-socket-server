const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer();
const io = new Server(server, {
	cors: {
		origin: "*", // Allow connections from external websites
		methods: ["GET", "POST"],
	},
});

// Create a namespace for /auction
const auctionNamespace = io.of("/auction");

// Store all bids by itemId
const bids = {};

auctionNamespace.on("connection", (socket) => {
	console.log("Client connected to /auction:", socket.id);

	// Handle bid history request
	socket.on("FETCH_BID_HISTORY", ({ itemId }) => {
		if (!itemId || !bids[itemId]) {
			socket.emit("bid_error", { message: "No bid history found for this item" });
			return;
		}
		socket.emit("BID_HISTORY", bids);
	});

	// Handle new bids
	socket.on("PLACE_BID", (data) => {
		const { itemId, amount, userId, timestamp } = data;

		if (!itemId || !amount || !userId || !timestamp) {
			socket.emit("BID_ERROR", { message: "Invalid bid data" });
			return;
		}

		// Store the bid in the bids object
		if (!bids[itemId]) {
			bids[itemId] = [];
		}
		const bid = { itemId, amount, userId, timestamp };
		bids[itemId].push(bid);

		// Emit a NEW_BID event with the bid payload
		auctionNamespace.emit("NEW_BID", bid);

		console.log(`New bid for item ${itemId}: $${amount} by user ${userId}`);
	});

	socket.on("disconnect", () => {
		console.log("Client disconnected from /auction:", socket.id);
	});
});

const PORT = process.env.PORT || 4200;
server.listen(PORT, () => {
	console.log(`Auction WebSocket server running on port ${PORT}`);
});
