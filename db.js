require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log("credentials", supabaseKey, supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// Batch for storing bids before writing to the database
let bidBatch = [];
const BATCH_WRITE_INTERVAL = 5000; // 5 seconds

// Periodically write batched bids to the database
setInterval(async () => {
	if (bidBatch.length > 0) {
		try {
			const batch = [...bidBatch];
			bidBatch = []; // Clear the batch
			const { error } = await supabase.from("bids").insert(batch);
			if (error) {
				console.error("Error writing batched bids:", error);
			} else {
				console.log(`Successfully wrote ${batch.length} bids to the database.`);
			}
		} catch (err) {
			console.error("Unexpected error during batch write:", err);
		}
	}
}, BATCH_WRITE_INTERVAL);

async function insertBid(bid) {
	// Validate bid object
	if (!bid.itemId || !bid.amount || !bid.userId || !bid.timestamp) {
		console.error("Invalid bid data:", bid);
		throw new Error("Invalid bid data");
	}

	// Add bid to the batch
	bidBatch.push(bid);
}

async function fetchBidsByItemId(itemId) {
	try {
		const { data, error } = await supabase.from("bids").select("*").eq("itemId", itemId);
		if (error) {
			console.error("Error fetching bids:", error);
			throw error;
		}
		return data;
	} catch (err) {
		console.error("Unexpected error in fetchBidsByItemId:", err);
		throw err;
	}
}

function subscribeToBids(onBidChange) {
	const subscription = supabase
		.channel("public:bids")
		.on("postgres_changes", { event: "*", schema: "public", table: "bids" }, (payload) => {
			console.log("Real-time bid change received:", {
				schema: payload.schema,
				table: payload.table,
				bid: payload.new,
				eventType: payload.eventType,
			});
			onBidChange(payload);
		})
		.subscribe();

	return subscription;
}

module.exports = { insertBid, fetchBidsByItemId, subscribeToBids };
