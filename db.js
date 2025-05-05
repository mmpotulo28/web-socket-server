require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error("Supabase credentials are missing. Please check your environment variables.");
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Store submitted bids in a Set
const bidBatch = new Set();

// Store the bids in the database at regular intervals
const BATCH_INTERVAL = 10000; // 5 seconds

setInterval(async () => {
	if (bidBatch.size === 0) return;

	try {
		const bidsArray = Array.from(bidBatch);
		const response = await supabase.from("bids").insert(bidsArray).select(); // Add .select() here

		if (response.error) {
			console.error("Error inserting bids:", response.error);
		} else {
			console.log("Bids inserted successfully:", response.data);
			bidBatch.clear(); // Clear the batch after successful insertion
		}
	} catch (err) {
		console.error("Unexpected error during bid insertion:", err);
	}
}, BATCH_INTERVAL);

async function insertBid(bid) {
	try {
		bidBatch.add(bid);
		console.log("New bid added to batch:", bid.itemId);
		const highestBid = Array.from(bidBatch).reduce(
			(maxBid, currentBid) => (currentBid.amount > maxBid.amount ? currentBid : maxBid),
			{ amount: -Infinity },
		);
		return highestBid;
	} catch (err) {
		console.error("Error adding bid to batch:", err);
		throw err;
	}
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

// get all bids
async function fetchAllBids() {
	try {
		const { data, error } = await supabase
			.from("bids")
			.select("*")
			.order("timestamp", { ascending: false });

		if (error) {
			console.error("Error fetching all bids:", error.message);
			throw new Error("Failed to fetch all bids");
		}

		return data || []; // Ensure it always returns an array
	} catch (err) {
		console.error("Unexpected error in fetchAllBids:", err);
		throw err;
	}
}

module.exports = { insertBid, fetchBidsByItemId, fetchAllBids };
