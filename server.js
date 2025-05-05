require("dotenv").config({ path: ".env.local" });
const http = require("http");
const { Server } = require("socket.io");
const { insertBid, fetchAllBids } = require("./db");

const PORT = process.env.PORT || 4200;
const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 5;

const server = http.createServer();
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

// Global error handling
process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err));
process.on("unhandledRejection", (reason, promise) =>
	console.error("Unhandled Rejection at:", promise, "reason:", reason),
);

const auctionNamespace = io.of("/auction");
const rateLimitMap = new Map();

auctionNamespace.on("connection", (socket) => {
	handleConnect(socket);

	socket.on("PLACE_BID", (data) => handlePlaceBid(socket, data));
	socket.on("disconnect", () => handleDisconnect(socket));
});

/***************Helper functions******************************** */
function handleConnect(socket) {
	console.log("Client connected to /auction:", socket.id);

	try {
		fetchAllBids()
			.then((bids) => {
				// now from all these bids, retrieve only the highest bid for each itemId
				const highestBids = bids.reduce((acc, bid) => {
					if (!acc[bid.itemId] || acc[bid.itemId].amount < bid.amount) {
						acc[bid.itemId] = bid;
					}
					return acc;
				}, {});

				// send the highest bids to the client
				socket.emit("HIGHEST_BIDS", { id: socket.id, highestBids });
				console.log("updating client highest bids", {
					id: socket.id,
					highestBidsCount: Object.values(highestBids).length,
				});
			})
			.catch((err) => {
				console.error("Error fetching bids:", err);
			});
	} catch (error) {
		console.error("Error in handleConnect:", error);
	}
}

function handlePlaceBid(socket, data) {
	const now = Date.now();
	const clientRateData = rateLimitMap.get(socket.id) || { count: 0, lastReset: now };

	// Reset rate limit window if necessary
	if (now - clientRateData.lastReset > RATE_LIMIT_WINDOW_MS) {
		clientRateData.count = 0;
		clientRateData.lastReset = now;
	}

	clientRateData.count += 1;

	// Enforce rate limit
	if (clientRateData.count > MAX_REQUESTS_PER_WINDOW) {
		socket.emit("RATE_LIMIT_EXCEEDED", {
			message: "Rate limit exceeded. Please try again later.",
		});
		return;
	}

	rateLimitMap.set(socket.id, clientRateData);

	const { itemId, amount, userId, timestamp } = data;

	if (!itemId || !amount || !userId || !timestamp) {
		socket.emit("BID_ERROR", { message: "Invalid bid data" });
		return;
	}

	const bid = { itemId, amount, userId, timestamp };

	insertBid(bid)
		.then((highestBid) => {
			auctionNamespace.emit("NEW_HIGHEST_BID", { itemId, amount, userId, highestBid });
			console.log(`New highest bid for item ${itemId}`, highestBid);
		})
		.catch((err) => {
			socket.emit("BID_ERROR", { message: "Failed to place bid", error: err.message });
		});
}

function handleDisconnect(socket) {
	console.log("Client disconnected from /auction:", socket.id);
	rateLimitMap.delete(socket.id);
}

server.listen(PORT, () => {
	console.log(`Auction WebSocket server running on port ${PORT}`);
});
