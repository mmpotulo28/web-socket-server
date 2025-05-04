require("dotenv").config({ path: ".env.local" });
fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
	headers: {
		apikey: process.env.SUPABASE_ANON_KEY,
	},
})
	.then((res) => console.log("Supabase API Response:", res.status))
	.catch((err) => console.error("Fetch Error:", err));
