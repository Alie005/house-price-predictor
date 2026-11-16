
import express from "express";
import cors from "cors";
import { pool, initDb } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

// ---------- Route 1: Health check ----------
app.get("/api/health", async (req, res) => {
    try {
        // Check whether PostgreSQL is reachable.
        await pool.query("SELECT 1");

        res.json({
            status: "ok",
            backend: "running",
            database: "connected"
        });
    } catch (err) {
        console.error("Health check database error:", err);

        res.status(503).json({
            status: "degraded",
            backend: "running",
            database: "unavailable"
        });
    }
});

// ---------- Route 2: Make a prediction ----------
app.post("/api/predict", async (req, res) => {
    try {
        // 1. Read and convert the input.
        const size = Number(req.body.size_sqm);
        const beds = Number(req.body.bedrooms);
        const age = Number(req.body.age_years);

        // 2. Validate the input.
        if (
            !(size > 0) ||
            !Number.isInteger(beds) ||
            beds < 1 ||
            !(age >= 0)
        ) {
            return res.status(400).json({
                error: "Please enter: size > 0, bedrooms (whole number >= 1), age >= 0."
            });
        }

        // 3. Check ML service configuration.
        if (!ML_SERVICE_URL) {
            throw new Error("ML_SERVICE_URL is missing from backend/.env");
        }

        // 4. Ask the Python ML service for a prediction.
        let mlResponse;

        try {
            mlResponse = await fetch(
                `${ML_SERVICE_URL}/predict`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        size_sqm: size,
                        bedrooms: beds,
                        age_years: age
                    }),
                    signal: AbortSignal.timeout(15000)
                }
            );
        } catch (err) {
            console.error("ML service connection error:", err);

            return res.status(502).json({
                error: "Could not connect to the Python ML service."
            });
        }

        if (!mlResponse.ok) {
            const message = await mlResponse.text();

            console.error("ML service response:", message);

            return res.status(502).json({
                error: `ML service returned HTTP ${mlResponse.status}.`
            });
        }

        const mlData = await mlResponse.json();
        const predictedPrice = Number(mlData.predicted_price_k);

        if (!Number.isFinite(predictedPrice)) {
            throw new Error("Python returned an invalid prediction.");
        }

        // 5. Save the prediction in PostgreSQL.
        let result;

        try {
            result = await pool.query(
                `INSERT INTO predictions
                 (size_sqm, bedrooms, age_years, predicted_price_k)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [size, beds, age, predictedPrice]
            );
        } catch (err) {
            console.error("Database save error:", err);

            return res.status(503).json({
                error: "Prediction calculated successfully, but saving failed. Check your Neon database connection."
            });
        }

        // 6. Return the saved record.
        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error("Predict error:", err);

        res.status(500).json({
            error: "Prediction failed due to a server error."
        });
    }
});

// ---------- Route 3: Recent predictions ----------
app.get("/api/predictions", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM predictions ORDER BY created_at DESC LIMIT 10"
        );

        res.json(result.rows);

    } catch (err) {
        console.error("History database error:", err);

        res.status(503).json({
            error: "Could not retrieve history. Check the Neon database connection."
        });
    }
});

// ---------- Start the server ----------
initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(
                `Backend running on http://localhost:${PORT}`
            );
        });
    })
    .catch((err) => {
        console.error("Could not initialize the database:", err);

        process.exit(1);
    });
